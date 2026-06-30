import type { KnowledgeBaseRef } from '../types';

// Catálogo (mock) das bases de conhecimento publicadas no **data-studio**.
// Espelha `knowledgeBases` de `data-studio/frontend/src/lib/mock-data.ts`.
// No produto real isto viria da API do data-studio (ex.: GET /knowledge-bases),
// e aqui só guardamos a referência (id + name) dentro da spec do agente.
export interface CatalogKnowledgeBase extends KnowledgeBaseRef {
  domain: string;
  documentCount: number;
}

export const dataStudioKnowledgeBases: CatalogKnowledgeBase[] = [
  { id: 'kb-rh', name: 'Políticas de RH', domain: 'RH', documentCount: 84 },
  { id: 'kb-suporte', name: 'Base de Suporte ao Cliente', domain: 'Suporte', documentCount: 312 },
  { id: 'kb-comercial', name: 'Base Comercial', domain: 'Vendas', documentCount: 156 },
  { id: 'kb-juridico', name: 'Repositório Jurídico', domain: 'Jurídico', documentCount: 47 },
  { id: 'kb-engenharia', name: 'Engenharia & Arquitetura', domain: 'Engenharia', documentCount: 218 },
  { id: 'kb-onboarding', name: 'Onboarding de Novos Times', domain: 'RH', documentCount: 12 },
];
