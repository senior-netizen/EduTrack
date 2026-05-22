import { AttendanceRecord, AttendanceStatus, PrismaClient } from '@prisma/client';

export type AttendanceAlertPayload = {
  schoolId: string;
  classId: string;
  studentId: string;
  attendancePercentage: number;
  threshold: number;
  window: { startDate: Date; endDate: Date };
};

export type LateArrivalPayload = {
  schoolId: string;
  classId: string;
  studentId: string;
  date: Date;
  reason?: string;
};

export function calculateAttendancePercentage(total: number, presentish: number): number {
  if (total <= 0) return 0;
  return Math.round((presentish / total) * 10000) / 100;
}

export class AttendanceService {
  constructor(private prisma: PrismaClient) {}

  async getDailyClassRegister(schoolId: string, classId: string, date: Date) {
    return this.prisma.attendanceRecord.findMany({ where: { schoolId, classId, date }, include: { student: true }, orderBy: { student: { lastName: 'asc' } } });
  }

  async getStudentAttendanceHistory(schoolId: string, studentId: string, startDate?: Date, endDate?: Date) {
    return this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentId, ...(startDate || endDate ? { date: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}) },
      orderBy: { date: 'asc' }
    });
  }

  async getAttendancePercentageByStudent(schoolId: string, studentId: string, startDate: Date, endDate: Date) {
    const records = await this.getStudentAttendanceHistory(schoolId, studentId, startDate, endDate);
    const presentish = records.filter((x: AttendanceRecord) => x.status === AttendanceStatus.PRESENT || x.status === AttendanceStatus.LATE || x.status === AttendanceStatus.EXCUSED).length;
    return { total: records.length, presentish, percentage: calculateAttendancePercentage(records.length, presentish) };
  }

  async getAttendancePercentageByClass(schoolId: string, classId: string, startDate: Date, endDate: Date) {
    const records = await this.prisma.attendanceRecord.findMany({ where: { schoolId, classId, date: { gte: startDate, lte: endDate } } });
    const presentish = records.filter((x: AttendanceRecord) => x.status !== AttendanceStatus.ABSENT).length;
    return { total: records.length, presentish, percentage: calculateAttendancePercentage(records.length, presentish) };
  }

  async getAttendancePercentageByTerm(schoolId: string, termId: string) {
    const records = await this.prisma.attendanceRecord.findMany({ where: { schoolId, termId } });
    const presentish = records.filter((x: AttendanceRecord) => x.status !== AttendanceStatus.ABSENT).length;
    return { total: records.length, presentish, percentage: calculateAttendancePercentage(records.length, presentish) };
  }

  async getMonthlySummary(schoolId: string, classId: string, year: number, month: number) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const records = await this.prisma.attendanceRecord.findMany({ where: { schoolId, classId, date: { gte: startDate, lte: endDate } } });
    return {
      startDate,
      endDate,
      total: records.length,
      byStatus: {
        PRESENT: records.filter((x: AttendanceRecord) => x.status === AttendanceStatus.PRESENT).length,
        ABSENT: records.filter((x: AttendanceRecord) => x.status === AttendanceStatus.ABSENT).length,
        LATE: records.filter((x: AttendanceRecord) => x.status === AttendanceStatus.LATE).length,
        EXCUSED: records.filter((x: AttendanceRecord) => x.status === AttendanceStatus.EXCUSED).length
      }
    };
  }

  async recordLateArrivalAndBuildEvent(schoolId: string, classId: string, studentId: string, date: Date, reason?: string): Promise<LateArrivalPayload> {
    await this.prisma.attendanceRecord.upsert({ where: { studentId_date: { studentId, date } }, update: { status: AttendanceStatus.LATE, reason, schoolId, classId }, create: { schoolId, classId, studentId, date, status: AttendanceStatus.LATE, reason } });
    return { schoolId, classId, studentId, date, reason };
  }

  async buildThresholdAlertPayload(schoolId: string, classId: string, studentId: string, threshold: number, startDate: Date, endDate: Date): Promise<AttendanceAlertPayload | null> {
    const stats = await this.getAttendancePercentageByStudent(schoolId, studentId, startDate, endDate);
    if (stats.percentage >= threshold) return null;
    return { schoolId, classId, studentId, attendancePercentage: stats.percentage, threshold, window: { startDate, endDate } };
  }
}
