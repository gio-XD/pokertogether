import type { TableInfo } from '../engine/types';
import { Table } from '../engine/table';
import { EMPTY_TABLE_TIMEOUT_MS } from '../engine/constants';

class LobbyManager {
  private tables = new Map<string, Table>();
  private emptyTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private onTableRemoved: (() => void) | null = null;

  /** Register a callback invoked whenever an idle table is auto-removed. */
  setOnTableRemoved(cb: () => void): void {
    this.onTableRemoved = cb;
  }

  createTable(table: Table): void {
    this.tables.set(table.config.id, table);
  }

  removeTable(tableId: string): void {
    this.clearEmptyTimer(tableId);
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

  /** Start a 30-minute idle countdown for a table with no connected players. */
  startEmptyTimer(tableId: string): void {
    this.clearEmptyTimer(tableId);
    this.emptyTimers.set(tableId, setTimeout(() => {
      const table = this.tables.get(tableId);
      if (!table) return;
      const hasConnected = table.state.players.some(p => p.isConnected);
      if (!hasConnected) {
        this.removeTable(tableId);
        this.onTableRemoved?.();
      }
    }, EMPTY_TABLE_TIMEOUT_MS));
  }

  /** Cancel the idle countdown (e.g. when a player reconnects). */
  clearEmptyTimer(tableId: string): void {
    const timer = this.emptyTimers.get(tableId);
    if (timer) {
      clearTimeout(timer);
      this.emptyTimers.delete(tableId);
    }
  }
}

// Singleton
export const lobbyManager = new LobbyManager();
