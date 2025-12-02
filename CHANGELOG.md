# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Unreleased]

### Fixed
- **Correção de filtro na lista de membros**: Garantido que o usuário logado sempre aparece na lista de membros ao selecionar responsável de tarefa
  - Corrigido `getWorkspaceMembers` para incluir o usuário atual mesmo que não esteja em `workspace_members`
  - Removido filtro que excluía o usuário logado da lista
  - Corrigido loop infinito de renderização em `TaskActionsMenu` e `TaskAssigneePicker`

### Added
- **TaskStatusPicker**: Novo componente picker para edição rápida de status diretamente no TaskRow
  - Status agora é editável inline, similar aos pickers de responsável e data
  - Feedback visual com chevron sutil no hover
  - Popover abre para baixo com todos os status disponíveis

### Changed
- **TaskRow**: Status badge agora é clicável e editável
  - Adicionado feedback visual (hover effects, chevron)
  - Melhorada UX com cursor pointer e transições suaves
- **TaskAssigneePicker**: Otimizado para buscar membros automaticamente
  - Removida dependência de `providedMembers` no useEffect para evitar loops
  - Adicionado cleanup para cancelar requisições pendentes
- **TaskActionsMenu**: Busca automática de membros quando não fornecidos
  - Busca membros usando `workspace_id` da tarefa
  - Corrigido loop infinito de renderização

### Technical
- Corrigido problema de re-renders infinitos causado por arrays nas dependências do useEffect
- Melhorada performance com cleanup adequado de requisições assíncronas
- Adicionado suporte para edição inline de status sem abrir modal completo

