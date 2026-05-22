import fp from 'fastify-plugin';

type StorageCategory = 'avatars' | 'documents' | 'logos' | 'report_cards';

class FileStorage {
  private files = new Map<string, { category: StorageCategory; filename: string; contentType: string; base64: string }>();

  put(category: StorageCategory, filename: string, contentType: string, base64: string) {
    const id = crypto.randomUUID();
    this.files.set(id, { category, filename, contentType, base64 });
    return { id, url: `/api/v1/files/${id}`, category, filename, contentType };
  }

  get(id: string) {
    return this.files.get(id) ?? null;
  }
}

export default fp(async (fastify) => {
  fastify.decorate('fileStorage', new FileStorage());
});
