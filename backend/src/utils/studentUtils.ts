import { PrismaClient } from '@prisma/client';

/**
 * Centrally generates a consistent Admission (GR) Number in the format:
 * GR-YYYY-NNNN (e.g., GR-2026-0001)
 * 
 * @param prisma - PrismaClient instance
 * @returns {Promise<string>} - The newly generated admission number
 */
export async function generateAdmissionNumber(prisma: any): Promise<string> {
    const prefix = `Int_`;

    // Find the highest sequence number
    const lastStudent = await prisma.student.findFirst({
        where: { admissionNumber: { startsWith: prefix } },
        orderBy: { admissionNumber: 'desc' },
        select: { admissionNumber: true }
    });

    let nextSeq = 1;
    if (lastStudent) {
        // Handle Int_0001 format
        const lastSeqStr = lastStudent.admissionNumber.replace(prefix, '');
        const lastSeq = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}
