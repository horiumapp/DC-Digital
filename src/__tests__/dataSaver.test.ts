/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DATA_SAVER_STORAGE_KEY,
  getConnectionProfile,
  getPingIntervals,
  getSyncBatchSize,
  isEconomyModeActive,
  isEconomyPreferenceEnabled,
  setEconomyPreference,
  shouldReduceMedia,
} from '../utils/dataSaver';

describe('dataSaver', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('preferência desligada por padrão', () => {
    expect(isEconomyPreferenceEnabled()).toBe(false);
    expect(getSyncBatchSize()).toBe(200);
    expect(getPingIntervals()).toEqual({ onlineMs: 60_000, offlineMs: 15_000 });
  });

  it('ativa lotes menores e ping mais espaçado com preferência ligada', () => {
    setEconomyPreference(true);
    expect(isEconomyPreferenceEnabled()).toBe(true);
    expect(isEconomyModeActive()).toBe(true);
    expect(shouldReduceMedia()).toBe(true);
    expect(getSyncBatchSize()).toBe(40);
    expect(getPingIntervals()).toEqual({ onlineMs: 120_000, offlineMs: 30_000 });
    expect(localStorage.getItem(DATA_SAVER_STORAGE_KEY)).toBe('1');
  });

  it('detecta Save-Data / 2G como conexão constrained', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true, effectiveType: '4g' },
    });
    expect(getConnectionProfile()).toBe('constrained');
    expect(isEconomyModeActive()).toBe(true);
    expect(getSyncBatchSize()).toBe(80);

    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: false, effectiveType: '2g' },
    });
    expect(getConnectionProfile()).toBe('constrained');
  });

  it('desliga preferência sem apagar detecção de rede', () => {
    setEconomyPreference(true);
    setEconomyPreference(false);
    expect(isEconomyPreferenceEnabled()).toBe(false);
    expect(localStorage.getItem(DATA_SAVER_STORAGE_KEY)).toBe('0');
  });
});
