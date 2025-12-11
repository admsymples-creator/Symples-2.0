---
name: ajustar-cores-e-texto-buckets-data
overview: Aplicar cores personalizadas aos grupos de data e renomear bucket "Próximos 7 dias" para "Semana" no agrupamento por data
todos:
  - id: update-toolbar-layout
    content: Reorganizar toolbar e remover tabs
    status: completed
  - id: clean-tab-logic
    content: Remover dependências de filtragem das tabs
    status: completed
  - id: style-check
    content: Ajustar estilos/responsividade da nova barra
    status: completed
---

# Ajustar cores e textos dos buckets de data

- Localizar renderização de grupos/colunas de data (lista e kanban) em `app/(main)/tasks/tasks-view.tsx` e componentes de grupo (`TaskGroup`/`TaskBoard`) para aplicar mapa de cores: Atrasadas=vermelho, Hoje=verde, Amanhã=amarelo, Esta Semana=azul, Futuro=azul-acinzentado, Sem Data=cinza claro.
- Substituir o rótulo/bucket "Próximos 7 dias" por "Semana" (identificar onde o texto é definido no agrupamento por data).
- Garantir que o novo nome siga a mesma ordenação e continue funcionando em drag/criação, e que as cores apareçam tanto na lista quanto no kanban (badges/headers indicadores).