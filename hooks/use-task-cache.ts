"use client";

import { useRef, useCallback } from "react";
import { TaskBasicDetails, TaskExtendedDetails } from "@/lib/actions/task-details";

interface CachedBasicData {
  data: TaskBasicDetails;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

interface CachedExtendedData {
  data: TaskExtendedDetails;
  timestamp: number;
  ttl: number;
}

/**
 * Hook para gerenciar cache de tarefas em memória
 * Cache de dados básicos: 5 minutos
 * Cache de dados estendidos: 2 minutos
 */
export function useTaskCache() {
  // Cache em memória usando Map
  const basicCacheRef = useRef<Map<string, CachedBasicData>>(new Map());
  const extendedCacheRef = useRef<Map<string, CachedExtendedData>>(new Map());

  // TTLs em milissegundos
  const BASIC_TTL = 5 * 60 * 1000; // 5 minutos
  const EXTENDED_TTL = 2 * 60 * 1000; // 2 minutos

  /**
   * Limpa entradas expiradas do cache
   */
  const cleanExpiredEntries = useCallback(() => {
    const now = Date.now();
    
    // Limpar cache básico
    for (const [key, value] of basicCacheRef.current.entries()) {
      if (now - value.timestamp > value.ttl) {
        basicCacheRef.current.delete(key);
      }
    }
    
    // Limpar cache estendido
    for (const [key, value] of extendedCacheRef.current.entries()) {
      if (now - value.timestamp > value.ttl) {
        extendedCacheRef.current.delete(key);
      }
    }
  }, []);

  /**
   * Obtém dados básicos do cache se ainda válidos
   */
  const getBasicData = useCallback((taskId: string): TaskBasicDetails | null => {
    cleanExpiredEntries();
    
    const cached = basicCacheRef.current.get(taskId);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      basicCacheRef.current.delete(taskId);
      return null;
    }
    
    return cached.data;
  }, [cleanExpiredEntries]);

  /**
   * Obtém dados estendidos do cache se ainda válidos
   */
  const getExtendedData = useCallback((taskId: string): TaskExtendedDetails | null => {
    cleanExpiredEntries();
    
    const cached = extendedCacheRef.current.get(taskId);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      extendedCacheRef.current.delete(taskId);
      return null;
    }
    
    return cached.data;
  }, [cleanExpiredEntries]);

  /**
   * Armazena dados básicos no cache
   */
  const setBasicData = useCallback((taskId: string, data: TaskBasicDetails) => {
    basicCacheRef.current.set(taskId, {
      data,
      timestamp: Date.now(),
      ttl: BASIC_TTL,
    });
  }, []);

  /**
   * Armazena dados estendidos no cache
   */
  const setExtendedData = useCallback((taskId: string, data: TaskExtendedDetails) => {
    extendedCacheRef.current.set(taskId, {
      data,
      timestamp: Date.now(),
      ttl: EXTENDED_TTL,
    });
  }, []);

  /**
   * Invalida cache de uma tarefa específica
   */
  const invalidate = useCallback((taskId: string) => {
    basicCacheRef.current.delete(taskId);
    extendedCacheRef.current.delete(taskId);
  }, []);

  /**
   * Invalida todo o cache
   */
  const clear = useCallback(() => {
    basicCacheRef.current.clear();
    extendedCacheRef.current.clear();
  }, []);

  /**
   * Verifica se dados básicos estão no cache e válidos
   */
  const hasBasicData = useCallback((taskId: string): boolean => {
    return getBasicData(taskId) !== null;
  }, [getBasicData]);

  /**
   * Verifica se dados estendidos estão no cache e válidos
   */
  const hasExtendedData = useCallback((taskId: string): boolean => {
    return getExtendedData(taskId) !== null;
  }, [getExtendedData]);

  return {
    getBasicData,
    getExtendedData,
    setBasicData,
    setExtendedData,
    invalidate,
    clear,
    hasBasicData,
    hasExtendedData,
  };
}





