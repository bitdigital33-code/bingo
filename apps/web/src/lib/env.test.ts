import { describe, expect, it } from 'vitest';
import { defaultApiUrl, resolveApiUrl, resolveSocketUrl } from './env';

type TestLocation = {
  origin: string;
  protocol: string;
  hostname: string;
};

describe('public env resolution', () => {
  it('prefere a mesma origem da pagina no navegador', () => {
    const location = createLocation('http://192.168.0.25:5173', '192.168.0.25');

    expect(defaultApiUrl(location)).toBe('http://192.168.0.25:5173');
  });

  it('ignora override localhost quando a pagina foi aberta por outro dispositivo', () => {
    const location = createLocation('http://192.168.0.25:5173', '192.168.0.25');

    expect(
      resolveApiUrl(
        {
          VITE_API_URL: 'http://localhost:4000',
        },
        location,
      ),
    ).toBe('http://192.168.0.25:5173');
  });

  it('mantem override explicito quando a API foi configurada externamente', () => {
    const location = createLocation('http://192.168.0.25:5173', '192.168.0.25');

    expect(
      resolveApiUrl(
        {
          VITE_API_URL: 'https://api.bingo.example.com/',
        },
        location,
      ),
    ).toBe('https://api.bingo.example.com');
  });

  it('faz o socket herdar a mesma origem quando nao houver configuracao', () => {
    const location = createLocation('http://192.168.0.25:5173', '192.168.0.25');

    expect(resolveSocketUrl({}, location)).toBe('http://192.168.0.25:5173');
  });
});

function createLocation(origin: string, hostname: string): TestLocation {
  return {
    origin,
    protocol: 'http:',
    hostname,
  };
}
