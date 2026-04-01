import type { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

type WebSocketEvent =
  | 'connected'
  | 'publish:status'
  | 'workflow:progress'
  | 'ai:generating'
  | 'ai:complete';

export interface WebSocketMessage {
  type: WebSocketEvent;
  batchId?: string;
  articleId?: string;
  timestamp: string;
  [key: string]: unknown;
}

interface ConnectionSubscriptions {
  batchIds: Set<string>;
  articleIds: Set<string>;
}

class WebsocketService {
  private wss: WebSocketServer | null = null;
  private readonly batchSubscribers = new Map<string, Set<WebSocket>>();
  private readonly articleSubscribers = new Map<string, Set<WebSocket>>();
  private readonly socketSubscriptions = new Map<WebSocket, ConnectionSubscriptions>();

  init(server: HttpServer): void {
    if (this.wss) {
      return;
    }

    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (socket, request) => {
      const url = new URL(request.url ?? '/ws', 'http://localhost');
      const batchId = url.searchParams.get('batchId')?.trim();
      const articleId = url.searchParams.get('articleId')?.trim();

      const subscriptions: ConnectionSubscriptions = {
        batchIds: new Set<string>(),
        articleIds: new Set<string>(),
      };

      if (batchId) {
        this.subscribe(this.batchSubscribers, batchId, socket);
        subscriptions.batchIds.add(batchId);
      }

      if (articleId) {
        this.subscribe(this.articleSubscribers, articleId, socket);
        subscriptions.articleIds.add(articleId);
      }

      this.socketSubscriptions.set(socket, subscriptions);

      this.send(socket, {
        type: 'connected',
        batchId: batchId || undefined,
        articleId: articleId || undefined,
        timestamp: new Date().toISOString(),
      });

      socket.on('close', () => {
        this.unsubscribe(socket);
      });

      socket.on('error', () => {
        this.unsubscribe(socket);
      });
    });
  }

  close(): void {
    for (const socket of this.socketSubscriptions.keys()) {
      try {
        socket.close();
      } catch {
        // Ignore close failures during shutdown.
      }
    }

    this.socketSubscriptions.clear();
    this.batchSubscribers.clear();
    this.articleSubscribers.clear();
    this.wss?.close();
    this.wss = null;
  }

  publishBatchStatus(batchId: string, payload: Record<string, unknown> = {}): void {
    this.broadcast(this.batchSubscribers, batchId, {
      type: 'publish:status',
      batchId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  publishWorkflowProgress(articleId: string, payload: Record<string, unknown> = {}): void {
    this.broadcast(this.articleSubscribers, articleId, {
      type: 'workflow:progress',
      articleId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  publishAIEvent(
    type: Extract<WebSocketEvent, 'ai:generating' | 'ai:complete'>,
    articleId: string,
    payload: Record<string, unknown> = {}
  ): void {
    this.broadcast(this.articleSubscribers, articleId, {
      type,
      articleId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  private subscribe(
    target: Map<string, Set<WebSocket>>,
    key: string,
    socket: WebSocket
  ): void {
    const subscribers = target.get(key) ?? new Set<WebSocket>();
    subscribers.add(socket);
    target.set(key, subscribers);
  }

  private unsubscribe(socket: WebSocket): void {
    const subscriptions = this.socketSubscriptions.get(socket);
    if (!subscriptions) {
      return;
    }

    for (const batchId of subscriptions.batchIds) {
      this.removeSocket(this.batchSubscribers, batchId, socket);
    }

    for (const articleId of subscriptions.articleIds) {
      this.removeSocket(this.articleSubscribers, articleId, socket);
    }

    this.socketSubscriptions.delete(socket);
  }

  private removeSocket(
    target: Map<string, Set<WebSocket>>,
    key: string,
    socket: WebSocket
  ): void {
    const subscribers = target.get(key);
    if (!subscribers) {
      return;
    }

    subscribers.delete(socket);
    if (subscribers.size === 0) {
      target.delete(key);
    }
  }

  private broadcast(
    target: Map<string, Set<WebSocket>>,
    key: string,
    message: WebSocketMessage
  ): void {
    const subscribers = target.get(key);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    for (const socket of subscribers) {
      this.send(socket, message);
    }
  }

  private send(socket: WebSocket, message: WebSocketMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      socket.send(JSON.stringify(message));
    } catch {
      this.unsubscribe(socket);
    }
  }
}

export const websocketService = new WebsocketService();
