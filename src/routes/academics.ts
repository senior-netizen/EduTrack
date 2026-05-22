import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { created, fail, mapZodIssues, ok } from '../utils/http';
import { denyCrossSchool, notFound } from '../utils/schoolScope';

const editorRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER'];
const subjectEditorRoles = [...editorRoles, 'HOD'];

function parseListQuery(query: any) {
  const page = Math.max(1, Number(query?.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(query?.perPage ?? 25)));
  return { page, perPage, skip: (page - 1) * perPage };
}

export async function academicRoutes(app: FastifyInstance) {
  app.post('/terms', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ academicYear: z.string(), name: z.string(), startDate: z.string(), endDate: z.string(), isActive: z.boolean().default(false) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));
    const term = await app.prisma.term.create({ data: { ...parsed.data, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), schoolId: jwt.schoolId } });
    return reply.code(201).send(created(term));
  });
  app.get('/terms', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => {
    const jwt = request.user as any; const { page, perPage, skip } = parseListQuery(request.query);
    const [data, total] = await Promise.all([
      app.prisma.term.findMany({ where: { schoolId: jwt.schoolId }, skip, take: perPage, orderBy: { createdAt: 'desc' } }),
      app.prisma.term.count({ where: { schoolId: jwt.schoolId } })
    ]);
    return reply.send(ok(data, { page, perPage, total, totalPages: Math.ceil(total / perPage) }));
  });
  app.get('/terms/:id', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => {
    const jwt = request.user as any; const { id } = request.params as any;
    const term = await app.prisma.term.findUnique({ where: { id } });
    if (!term) return notFound(reply, 'Term'); if (term.schoolId !== jwt.schoolId) return denyCrossSchool(reply, 'Term');
    return reply.send(ok(term));
  });
  app.put('/terms/:id', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any; const { id } = request.params as any;
    const schema = z.object({ academicYear: z.string().optional(), name: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(), isActive: z.boolean().optional() });
    const parsed = schema.safeParse(request.body); if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const term = await app.prisma.term.findUnique({ where: { id } }); if (!term) return notFound(reply, 'Term'); if (term.schoolId !== jwt.schoolId) return denyCrossSchool(reply, 'Term');
    const payload: any = { ...parsed.data }; if (payload.startDate) payload.startDate = new Date(payload.startDate); if (payload.endDate) payload.endDate = new Date(payload.endDate);
    return reply.send(ok(await app.prisma.term.update({ where: { id }, data: payload })));
  });
  app.delete('/terms/:id', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any; const { id } = request.params as any;
    const term = await app.prisma.term.findUnique({ where: { id } }); if (!term) return notFound(reply, 'Term'); if (term.schoolId !== jwt.schoolId) return denyCrossSchool(reply, 'Term');
    return reply.send(ok(await app.prisma.term.update({ where: { id }, data: { isActive: false } })));
  });

  app.post('/classes', { preHandler: [app.authenticate, app.authorize(editorRoles)] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ name: z.string(), grade: z.string(), stream: z.string().optional(), capacity: z.number().int().positive().default(45), classTeacherId: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));
    if (parsed.data.classTeacherId) {
      const teacher = await app.prisma.user.findUnique({ where: { id: parsed.data.classTeacherId }, select: { id: true, schoolId: true } });
      if (!teacher) return notFound(reply, 'Teacher');
      if (teacher.schoolId !== jwt.schoolId) return denyCrossSchool(reply, 'Teacher');
    }
    const created = await app.prisma.class.create({ data: { ...parsed.data, schoolId: jwt.schoolId } });
    return reply.code(201).send(created(created));
  });
  app.get('/classes', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt = request.user as any; const { page, perPage, skip } = parseListQuery(request.query); const where: any = { schoolId: jwt.schoolId }; const q:any=request.query||{}; if(q.grade) where.grade=q.grade; if(q.search) where.name={contains:q.search,mode:'insensitive'}; const [data,total]=await Promise.all([app.prisma.class.findMany({where,skip,take:perPage,orderBy:{createdAt:'desc'}}),app.prisma.class.count({where})]); return reply.send(ok(data,{page,perPage,total,totalPages:Math.ceil(total/perPage)})); });
  app.get('/classes/:id', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const record=await app.prisma.class.findUnique({where:{id}}); if(!record) return notFound(reply,'Class'); if(record.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Class'); return reply.send(ok(record)); });
  app.put('/classes/:id', { preHandler: [app.authenticate, app.authorize(editorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const schema=z.object({ name:z.string().optional(), grade:z.string().optional(), stream:z.string().nullable().optional(), capacity:z.number().int().positive().optional(), classTeacherId:z.string().nullable().optional(), isActive:z.boolean().optional() }); const parsed=schema.safeParse(request.body); if(!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR','Invalid payload',parsed.error.issues)); const record=await app.prisma.class.findUnique({where:{id}}); if(!record) return notFound(reply,'Class'); if(record.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Class'); return reply.send(ok(await app.prisma.class.update({where:{id},data:parsed.data as any}))); });
  app.delete('/classes/:id', { preHandler: [app.authenticate, app.authorize(editorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const record=await app.prisma.class.findUnique({where:{id}}); if(!record) return notFound(reply,'Class'); if(record.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Class'); return reply.send(ok(await app.prisma.class.update({where:{id},data:{isActive:false}}))); });

  app.post('/subjects', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ name: z.string(), code: z.string(), department: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));
    const created = await app.prisma.subject.create({ data: { ...parsed.data, schoolId: jwt.schoolId } });
    return reply.code(201).send(created(created));
  });
  app.get('/subjects', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const { page, perPage, skip }=parseListQuery(request.query); const [data,total]=await Promise.all([app.prisma.subject.findMany({where:{schoolId:jwt.schoolId},skip,take:perPage,orderBy:{createdAt:'desc'}}),app.prisma.subject.count({where:{schoolId:jwt.schoolId}})]); return reply.send(ok(data,{page,perPage,total,totalPages:Math.ceil(total/perPage)})); });
  app.get('/subjects/:id', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const s=await app.prisma.subject.findUnique({where:{id}}); if(!s) return notFound(reply,'Subject'); if(s.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Subject'); return reply.send(ok(s)); });
  app.put('/subjects/:id', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const parsed=z.object({name:z.string().optional(),code:z.string().optional(),department:z.string().nullable().optional(),isActive:z.boolean().optional()}).safeParse(request.body); if(!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR','Invalid payload',parsed.error.issues)); const s=await app.prisma.subject.findUnique({where:{id}}); if(!s) return notFound(reply,'Subject'); if(s.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Subject'); return reply.send(ok(await app.prisma.subject.update({where:{id},data:parsed.data as any}))); });
  app.delete('/subjects/:id', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const s=await app.prisma.subject.findUnique({where:{id}}); if(!s) return notFound(reply,'Subject'); if(s.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Subject'); return reply.send(ok(await app.prisma.subject.update({where:{id},data:{isActive:false}}))); });

  app.post('/class-subject-assignments', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const parsed=z.object({classId:z.string(),subjectId:z.string(),teacherId:z.string()}).safeParse(request.body); if(!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR','Invalid payload',parsed.error.issues)); const {classId,subjectId,teacherId}=parsed.data; const [klass,subject,teacher]=await Promise.all([app.prisma.class.findUnique({where:{id:classId}}),app.prisma.subject.findUnique({where:{id:subjectId}}),app.prisma.user.findUnique({where:{id:teacherId}})]); if(!klass) return notFound(reply,'Class'); if(!subject) return notFound(reply,'Subject'); if(!teacher) return notFound(reply,'Teacher'); if([klass.schoolId,subject.schoolId,teacher.schoolId].some((s)=>s!==jwt.schoolId)) return denyCrossSchool(reply,'Assignment dependency'); const assignment=await app.prisma.classSubject.create({data:{schoolId:jwt.schoolId,classId,subjectId,teacherId}}); return reply.code(201).send(ok(assignment)); });
  app.get('/class-subject-assignments', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const q:any=request.query||{}; const where:any={schoolId:jwt.schoolId}; if(q.classId) where.classId=q.classId; if(q.subjectId) where.subjectId=q.subjectId; if(q.teacherId) where.teacherId=q.teacherId; return reply.send(ok(await app.prisma.classSubject.findMany({where,orderBy:{classId:'asc'}}))); });
  app.delete('/class-subject-assignments/:id', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const a=await app.prisma.classSubject.findUnique({where:{id}}); if(!a) return notFound(reply,'Assignment'); if(a.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Assignment'); await app.prisma.classSubject.delete({where:{id}}); return reply.send(ok({id,removed:true})); });

  app.get('/classes/:id/timetable', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const klass=await app.prisma.class.findUnique({where:{id}}); if(!klass) return notFound(reply,'Class'); if(klass.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Class'); const data=await app.prisma.timetableEntry.findMany({where:{schoolId:jwt.schoolId,classId:id},orderBy:[{dayOfWeek:'asc'},{startTime:'asc'}]}); return reply.send(ok(data)); });
  app.put('/classes/:id/timetable', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const parsed=z.object({entries:z.array(z.object({dayOfWeek:z.number().int().min(1).max(7),startTime:z.string(),endTime:z.string(),subjectId:z.string(),teacherId:z.string().optional(),room:z.string().optional()}))}).safeParse(request.body); if(!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR','Invalid payload',parsed.error.issues)); const klass=await app.prisma.class.findUnique({where:{id}}); if(!klass) return notFound(reply,'Class'); if(klass.schoolId!==jwt.schoolId) return denyCrossSchool(reply,'Class'); await app.prisma.timetableEntry.deleteMany({where:{schoolId:jwt.schoolId,classId:id}}); const created=await app.prisma.$transaction(parsed.data.entries.map((e)=>app.prisma.timetableEntry.create({data:{...e,schoolId:jwt.schoolId,classId:id}}))); return reply.send(ok(created)); });
  app.get('/classes/:id/curriculum', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; return reply.send(ok(await app.prisma.curriculumItem.findMany({where:{schoolId:jwt.schoolId,classId:id},orderBy:{createdAt:'asc'}}))); });
  app.post('/classes/:id/curriculum', { preHandler: [app.authenticate, app.authorize(subjectEditorRoles)] }, async (request, reply) => { const jwt=request.user as any; const {id}=request.params as any; const parsed=z.object({subjectId:z.string(),topic:z.string(),objectives:z.array(z.string()).default([]),termId:z.string().optional()}).safeParse(request.body); if(!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR','Invalid payload',parsed.error.issues)); return reply.code(201).send(ok(await app.prisma.curriculumItem.create({data:{...parsed.data,schoolId:jwt.schoolId,classId:id}}))); });
}
