import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncAction {
  id: string;
  entityType: 'device' | 'cable' | 'rack' | 'room';
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
  synced: 0 | 1;
}

interface DCVisualizerDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncAction;
    indexes: { 'by-synced': number };
  };
  devices: {
    key: string;
    value: any;
  };
  cables: {
    key: string;
    value: any;
  };
  templates: {
    key: string;
    value: any;
  };
  racks: {
    key: string;
    value: any;
  };
  rooms: {
    key: string;
    value: any;
  };
  meta: {
    key: string;
    value: any;
  };
}

let db: IDBPDatabase<DCVisualizerDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<DCVisualizerDB>> {
  if (db) return db;

  db = await openDB<DCVisualizerDB>('dc-visualizer', 1, {
    upgrade(database) {
      // 鍚屾闃熷垪
      const syncStore = database.createObjectStore('syncQueue', { keyPath: 'id' });
      syncStore.createIndex('by-synced', 'synced');

      // 鏁版嵁缂撳瓨
      database.createObjectStore('devices', { keyPath: 'id' });
      database.createObjectStore('cables', { keyPath: 'id' });
      database.createObjectStore('templates', { keyPath: 'id' });
      database.createObjectStore('racks', { keyPath: 'id' });
      database.createObjectStore('rooms', { keyPath: 'id' });
      database.createObjectStore('meta', { keyPath: 'key' });
    },
  });

  return db;
}

// ==================== 鍚屾闃熷垪鎿嶄綔 ====================

export async function addToSyncQueue(action: Omit<SyncAction, 'id' | 'synced'>) {
  const database = await initDB();
  const syncAction: SyncAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    synced: 0,
  };
  await database.add('syncQueue', syncAction);
  return syncAction;
}

export async function getPendingSyncActions(): Promise<SyncAction[]> {
  const database = await initDB();
  return database.getAllFromIndex('syncQueue', 'by-synced', 0);
}

export async function markAsSynced(ids: string[]) {
  const database = await initDB();
  const tx = database.transaction('syncQueue', 'readwrite');
  for (const id of ids) {
    const action = await tx.store.get(id);
    if (action) {
      action.synced = 1;
      await tx.store.put(action);
    }
  }
  await tx.done;
}

export async function clearSyncedActions() {
  const database = await initDB();
  const synced = await database.getAllFromIndex('syncQueue', 'by-synced', 1);
  const tx = database.transaction('syncQueue', 'readwrite');
  for (const action of synced) {
    await tx.store.delete(action.id);
  }
  await tx.done;
}

// ==================== 缂撳瓨鏁版嵁鎿嶄綔 ====================

export async function cacheData(store: 'devices' | 'cables' | 'templates' | 'racks' | 'rooms', data: any[]) {
  const database = await initDB();
  const tx = database.transaction(store, 'readwrite');
  for (const item of data) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getCachedData(store: 'devices' | 'cables' | 'templates' | 'racks' | 'rooms'): Promise<any[]> {
  const database = await initDB();
  return database.getAll(store);
}

export async function getCachedItem(store: 'devices' | 'cables' | 'templates' | 'racks' | 'rooms', id: string): Promise<any | undefined> {
  const database = await initDB();
  return database.get(store, id);
}

// ==================== 鍏冩暟鎹搷浣?====================

export async function setLastSyncTime(time: number) {
  const database = await initDB();
  await database.put('meta', { key: 'lastSyncTime', value: time });
}

export async function getLastSyncTime(): Promise<number> {
  const database = await initDB();
  const meta = await database.get('meta', 'lastSyncTime');
  return meta?.value || 0;
}

// ==================== 绂荤嚎鎿嶄綔 ====================

// 鍒涘缓绾跨紗锛堢绾匡級
export async function createCableOffline(cableData: any) {
  const database = await initDB();

  // 鐢熸垚涓存椂ID
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const cable = {
    ...cableData,
    id: tempId,
    status: 'RECORDED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 保存到本地缓存
  await database.put('cables', cable);

  // 添加到同步队列
  await addToSyncQueue({
    entityType: 'cable',
    actionType: 'CREATE',
    data: cable,
    timestamp: Date.now(),
  });

  return cable;
}

// 更新线缆状态（离线）
export async function updateCableStatusOffline(id: string, status: string) {
  const database = await initDB();

  const cable = await database.get('cables', id);
  if (!cable) return null;

  const updated = {
    ...cable,
    status,
    updatedAt: new Date().toISOString(),
  };

  await database.put('cables', updated);

  await addToSyncQueue({
    entityType: 'cable',
    actionType: 'UPDATE',
    data: { id, status },
    timestamp: Date.now(),
  });

  return updated;
}

