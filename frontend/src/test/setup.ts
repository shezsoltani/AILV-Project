import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';
// Globales React bereitstellen, falls die Runtime Probleme macht
(globalThis as any).React = React;

// Erweitert die Vitest 'expect' Funktion um die Matcher von jest-dom (z.B. toBeInTheDocument)
expect.extend(matchers);

// Nach jedem Test den DOM aufräumen, um Seiteneffekte zu vermeiden
afterEach(() => {
  cleanup();
});