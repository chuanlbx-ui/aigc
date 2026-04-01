import { useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '../api/config';

export interface WebSocketEventMessage {
  type: string;
  batchId?: string;
  articleId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  batchId?: string;
  articleId?: string;
  enabled?: boolean;
  onMessage?: (message: WebSocketEventMessage) => void;
}

function buildWebSocketUrl(batchId?: string, articleId?: string): string {
  const baseUrl = API_CONFIG.baseUrl || window.location.origin;
  const httpUrl = new URL(baseUrl, window.location.origin);
  const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = new URL('/ws', `${wsProtocol}//${httpUrl.host}`);

  if (batchId) {
    wsUrl.searchParams.set('batchId', batchId);
  }

  if (articleId) {
    wsUrl.searchParams.set('articleId', articleId);
  }

  return wsUrl.toString();
}

export function useWebSocket({
  batchId,
  articleId,
  enabled = true,
  onMessage,
}: UseWebSocketOptions): boolean {
  const onMessageRef = useRef(onMessage);
  const reconnectTimerRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || (!batchId && !articleId)) {
      setConnected(false);
      return;
    }

    shouldReconnectRef.current = true;
    let socket: WebSocket | null = null;

    const connect = () => {
      socket = new WebSocket(buildWebSocketUrl(batchId, articleId));

      socket.onopen = () => {
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketEventMessage;
          onMessageRef.current?.(message);
        } catch (error) {
          console.error('Failed to parse websocket message:', error);
        }
      };

      socket.onerror = () => {
        setConnected(false);
      };

      socket.onclose = () => {
        setConnected(false);

        if (!shouldReconnectRef.current) {
          return;
        }

        reconnectTimerRef.current = window.setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      setConnected(false);

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      socket?.close();
    };
  }, [articleId, batchId, enabled]);

  return connected;
}
