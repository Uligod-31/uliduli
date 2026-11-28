// «A minha música»: ficheiros que a própria pessoa escolhe no telemóvel para um mundo. Ficam só no aparelho
// (IndexedDB do navegador) e nunca são enviados para lado nenhum.
export interface MyFile { name: string; blob: Blob }

const memory = new Map<string, MyFile[]>();
let db: Promise<IDBDatabase | null> | undefined;

function open(): Promise<IDBDatabase | null> {
  return (db ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open('uliduli-musica', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('mundos');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  }));
}

function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then((d) => new Promise<T | undefined>((resolve) => {
    if (!d) { resolve(undefined); return; }
    try {
      const t = d.transaction('mundos', mode), req = op(t.objectStore('mundos'));
      t.oncomplete = () => resolve(req.result);
      t.onerror = t.onabort = () => resolve(undefined);
    } catch { resolve(undefined); }
  }));
}

export const library = {
  async get(world: string): Promise<MyFile[]> {
    const known = memory.get(world);
    if (known) return known;
    const files = ((await run('readonly', (s) => s.get(world))) as MyFile[] | undefined) ?? [];
    memory.set(world, files);
    return files;
  },
  /** devolve false se não deu para guardar no aparelho (fica só até fechar o jogo) */
  async set(world: string, files: MyFile[]): Promise<boolean> {
    memory.set(world, files);
    return (await run('readwrite', (s) => s.put(files, world))) !== undefined;
  },
  async remove(world: string) {
    memory.set(world, []);
    await run('readwrite', (s) => s.delete(world));
  },
};
