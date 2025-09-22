// Simple in-memory data store for Vercel deployment
// This will persist data for the duration of the serverless function instance

class DataStore {
  private static instance: DataStore;
  private data: any = null;

  private constructor() {}

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  setData(data: any) {
    this.data = data;
    console.log('Data stored in memory:', data ? 'Success' : 'Empty');
  }

  getData() {
    console.log('Retrieving data from memory:', this.data ? 'Found' : 'Not found');
    return this.data;
  }

  clearData() {
    this.data = null;
  }
}

export const dataStore = DataStore.getInstance();