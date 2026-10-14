import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPEG files are allowed.'));
    }
  },
});

// Upload Document Endpoint
router.post('/', authenticate, upload.single('file'), (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded.' });
    return;
  }

  res.json({
    fileName: req.file.filename,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    storagePath: req.file.path,
    url: `/api/uploads/${req.file.filename}`,
  });
});

// Secure Document Access (Strict Authorization)
router.get('/:filename', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const filename = String(req.params.filename);
    const user = req.user!;

    // Find attachment in DB to check ownership & access
    const attachment = await prisma.applicationAttachment.findFirst({
      where: { fileName: filename },
      include: {
        application: {
          include: {
            applicant: {
              include: { studentProfile: true },
            },
          },
        },
      },
    });

    if (attachment) {
      const app = (attachment as any).application;
      // If student: must be applicant
      if (user.role === 'STUDENT' && app.applicantId !== user.id) {
        res.status(403).json({ message: 'Access denied: You cannot view documents belonging to another student.' });
        return;
      }
      // If Advisor: must match class
      if (user.role === 'CLASS_ADVISOR') {
        const isAssigned = user.staffProfile?.advisorAssignments?.some(
          (a: any) => a.classId === app.applicant.studentProfile?.classId
        );
        if (!isAssigned) {
          res.status(403).json({ message: 'Access denied: You are not assigned to this student’s class.' });
          return;
        }
      }
      // If HOD: must match department
      if (user.role === 'HOD') {
        const isAssigned = user.staffProfile?.hodAssignments?.some(
          (a: any) => a.departmentId === app.applicant.studentProfile?.departmentId
        );
        if (!isAssigned) {
          res.status(403).json({ message: 'Access denied: You are not assigned to this student’s department.' });
          return;
        }
      }
      // If Warden: must match hostel
      if (user.role === 'WARDEN') {
        const isAssigned = user.staffProfile?.wardenAssignments?.some(
          (a: any) => a.hostelId === app.applicant.studentProfile?.hostelId
        );
        if (!isAssigned) {
          res.status(403).json({ message: 'Access denied: You are not assigned to this student’s hostel.' });
          return;
        }
      }
    }

    const filePath = path.join(uploadDir, path.basename(filename));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'File not found on server.' });
      return;
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: 'Failed to access file.' });
  }
});

export default router;
