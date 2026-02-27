import PocketBase from 'pocketbase'

const pb = new PocketBase('https://sistemac.fs-sistema.cloud')

class DataService {

  // ===== GENERIC METHODS =====

  async list(collection: string): Promise<any[]> {
    const list = await pb.collection(collection).getFullList({
      sort: '-created',
      $autoCancel: false
    })
    return list as any[]
  }

  async getOne(collection: string, id: string): Promise<any> {
    const record = await pb.collection(collection).getOne(id)
    return record as any
  }

  async findOne(collection: string, filter: string): Promise<any> {
    const record = await pb.collection(collection).getFirstListItem(filter)
    return record as any
  }

  async create(collection: string, data: any): Promise<any> {
    const record = await pb.collection(collection).create(data)
    return record as any
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    const record = await pb.collection(collection).update(id, data)
    return record as any
  }

  async delete(collection: string, id: string): Promise<boolean> {
    return await pb.collection(collection).delete(id)
  }

  subscribe(collection: string, callback: Function) {
    pb.collection(collection).subscribe('*', (e) => {
      callback(e)
    })
  }
}

export const dataService = new DataService()