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
    try {
      const cleanData = JSON.parse(JSON.stringify(data));
      const systemFields = ['id', 'created', 'updated', 'collectionId', 'collectionName', 'expand'];
      systemFields.forEach(field => delete cleanData[field]);

      console.log(`[DataService] Creating in ${collection}:`, cleanData);
      const record = await pb.collection(collection).create(cleanData);
      return record as any;
    } catch (error: any) {
      console.error(`[DataService] Error creating in ${collection}:`, error);
      if (error?.response?.data) {
        console.error(`[DataService] Validação detalhada do PocketBase:`, JSON.stringify(error.response.data));
        alert('Erro no Banco de Dados: ' + JSON.stringify(error.response.data));
      }
      throw error;
    }
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    try {
      const cleanData = JSON.parse(JSON.stringify(data));
      const systemFields = ['id', 'created', 'updated', 'collectionId', 'collectionName', 'expand'];
      systemFields.forEach(field => delete cleanData[field]);

      console.log(`[DataService] Updating ${collection}/${id}:`, cleanData);
      const record = await pb.collection(collection).update(id, cleanData);
      return record as any;
    } catch (error: any) {
      console.error(`[DataService] Error updating ${collection}/${id}:`, error);
      if (error?.response?.data) {
        console.error(`[DataService] Validação detalhada do PocketBase:`, JSON.stringify(error.response.data));
        alert('Erro no Banco de Dados: ' + JSON.stringify(error.response.data));
      }
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<boolean> {
    try {
      return await pb.collection(collection).delete(id);
    } catch (error: any) {
      console.error(`[DataService] Error deleting in ${collection}:`, error);
      if (error?.response?.data) {
        console.error(`[DataService] Validação detalhada do PocketBase:`, JSON.stringify(error.response.data));
        alert('Erro no Banco de Dados ao Deletar: ' + JSON.stringify(error.response.data));
      } else {
        alert('Erro ao excluir: ' + error.message);
      }
      throw error;
    }
  }

  subscribe(collection: string, callback: Function) {
    pb.collection(collection).subscribe('*', (e) => {
      callback(e)
    })
  }
}

export const dataService = new DataService()