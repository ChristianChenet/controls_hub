import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

declare const __APP_BUILD_ID__: string;

const CHAVE_VERSAO_FRONT = 'controlSHubBuildId';
const CHAVE_RELOAD_FRONT = 'controlSHubReloadBuildId';
const buildAtual = __APP_BUILD_ID__;
const buildAnterior = localStorage.getItem(CHAVE_VERSAO_FRONT);
const ultimoReload = sessionStorage.getItem(CHAVE_RELOAD_FRONT);

if (buildAnterior && buildAnterior !== buildAtual && ultimoReload !== buildAtual) {
  localStorage.setItem(CHAVE_VERSAO_FRONT, buildAtual);
  sessionStorage.setItem(CHAVE_RELOAD_FRONT, buildAtual);
  window.location.reload();
} else {
  localStorage.setItem(CHAVE_VERSAO_FRONT, buildAtual);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
