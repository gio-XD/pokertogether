import type { TableInfo } from '../engine/types';
import { Table } from '../engine/table';

class LobbyManager {
  private tables = new Map<string, Table>();

  createTable(table: Table): void {
    this.tables.set(table.config.id, table);
  }

  removeTable(tableId: string): void {
    const table = this.tables.get(tableId);
    if (table) {
      table.destroy();
      this.tables.delete(tableId);
    }
  }

  getTable(tableId: string): Table | undefined {
    return this.tables.get(tableId);
  }

  getTableList(): TableInfo[] {
    return Array.from(this.tables.values()).map(t => t.getTableInfo());
  }

  getAllTables(): Map<string, Table> {
    return this.tables;
  }
}

// Singleton
export const lobbyManager = new LobbyManager();
