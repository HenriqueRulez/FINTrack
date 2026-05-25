### Botão de Logout na Página de Configurações

**User Story**
Como utilizador do FINTrack, quero conseguir terminar a minha sessão directamente na página de Configurações para que possa fazer logout sem depender de outros elementos da interface.

**Contexto**
Actualmente existe um botão "Sair" na Navbar (topo da página), mas está discreto e pode passar despercebido. A página de Configurações é o local natural para gerir a sessão, pois é onde o utilizador vê o seu perfil (e-mail e ID). Não existindo nenhum mecanismo de logout visível e explícito nas Configurações, o utilizador fica sem alternativa clara caso a Navbar não seja óbvia.

**Critérios de Aceite**

- [ ] CA1: A página de Configurações apresenta um botão ou acção de "Terminar sessão" (ou equivalente) visível dentro do conteúdo da página, sem necessidade de interagir com a Navbar.
- [ ] CA2: Ao activar o botão de logout, a sessão é terminada e o utilizador é redirecionado para a página de login, sem manter acesso às páginas protegidas.
- [ ] CA3: O botão de logout está visivelmente separado das informações de perfil (e-mail, ID), de forma a evitar acções acidentais.
- [ ] CA4: Enquanto o logout está a ser processado, o botão fica desactivado ou apresenta indicação visual de carregamento, impedindo cliques múltiplos.

**Requisitos Não-Funcionais**

- O botão deve ser claramente distinguível como acção destrutiva/de saída, usando cor ou estilo diferente do resto dos elementos da página.

**Dependências**

- Mecanismo de autenticação Supabase já existente (utilizado pela Navbar).

**Fora do Escopo**

- Alterar ou remover o botão "Sair" existente na Navbar.
- Confirmação por modal antes de fazer logout.
- Logout de todos os dispositivos / gestão de sessões múltiplas.
