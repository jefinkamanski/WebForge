import { forms, sections, type SectionGroup, type SiteContent } from '@webforge/shared';
import {
  ImagesIcon,
  InboxIcon,
  KeyRoundIcon,
  LayoutTemplateIcon,
  LogOutIcon,
  NewspaperIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useLoaderData, useMatch, useNavigation, useSubmit } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu.tsx';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '../components/ui/sidebar.tsx';
import { api, mediaUrl } from '../lib/api.ts';
import { requireUser } from '../modules/auth/auth.api.ts';

interface SiteLogo {
  src: string;
  alt: string;
}

// Logo do Cabeçalho do site (GET /site, público). Sem logo ou sem resposta: texto "Painel".
async function fetchSiteLogo(): Promise<SiteLogo | null> {
  try {
    const { header, seo } = await api<SiteContent>('/site');
    return header.logo
      ? { src: mediaUrl(header.logo.url), alt: header.logo.alt || seo.siteName }
      : null;
  } catch {
    return null;
  }
}

export async function loader() {
  const [user, logo] = await Promise.all([requireUser(), fetchSiteLogo()]);
  return { user, logo };
}

function Brand({ logo }: { logo: SiteLogo | null }) {
  if (!logo) return <span className="text-lg font-semibold">Painel</span>;
  return <img src={logo.src} alt={logo.alt} className="h-12 w-auto max-w-40 object-contain" />;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Uma entrada por seção registrada em packages/shared/src/site, na ordem do registro,
// no grupo definido em defineSection({ group })
const sectionItems = (group: SectionGroup, icon: LucideIcon): NavItem[] =>
  Object.values(sections)
    .filter((section) => section.group === group)
    .map((section) => ({ to: `/sections/${section.key}`, label: section.label, icon }));

// Um item por formulário registrado em packages/shared/src/site
const formItems: NavItem[] = Object.values(forms).map(({ key, label }) => ({
  to: `/forms/${key}`,
  label,
  icon: InboxIcon,
}));

const navGroups: NavGroup[] = [
  { title: 'Seções do site', items: sectionItems('content', LayoutTemplateIcon) },
  { title: 'Blog', items: [{ to: '/posts', label: 'Posts', icon: NewspaperIcon }] },
  { title: 'Formulários', items: formItems },
  { title: 'Arquivos', items: [{ to: '/media', label: 'Mídia', icon: ImagesIcon }] },
  { title: 'Configurações', items: sectionItems('settings', SettingsIcon) },
].filter((group) => group.items.length > 0);

function NavItemLink({ item }: { item: NavItem }) {
  // No celular o menu é uma gaveta: fecha ao escolher uma página
  const { isMobile, setOpenMobile } = useSidebar();
  // Ativo também nas subpáginas (ex.: /posts/12 deixa "Posts" marcado)
  const active = useMatch({ path: item.to, end: false }) !== null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <NavLink to={item.to} onClick={() => isMobile && setOpenMobile(false)}>
          <item.icon aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AppSidebar({ logo }: { logo: SiteLogo | null }) {
  return (
    <Sidebar>
      <SidebarHeader className="h-18 justify-center px-6">
        <Brand logo={logo} />
      </SidebarHeader>
      <SidebarContent className="px-3">
        <nav aria-label="Principal">
          {navGroups.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavItemLink key={item.to} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}

function UserMenu({ email }: { email: string }) {
  const submit = useSubmit();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu da conta"
        className="bg-primary text-primary-foreground focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-full text-sm font-semibold uppercase outline-none focus-visible:ring-[3px]"
      >
        {email.charAt(0)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-muted-foreground truncate font-normal">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <NavLink to="/change-password">
            <KeyRoundIcon aria-hidden="true" />
            Trocar senha
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void submit(null, { method: 'post', action: '/logout' })}>
          <LogOutIcon aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Moldura das páginas com login: menu lateral, cabeçalho com a conta e o conteúdo.
// No celular o menu vira uma gaveta, aberta pelo botão do cabeçalho.
export function Component() {
  const { user, logo } = useLoaderData<typeof loader>();
  const navigating = useNavigation().state !== 'idle';

  return (
    <SidebarProvider>
      <AppSidebar logo={logo} />
      <SidebarInset>
        {navigating && (
          <div
            role="status"
            aria-label="Carregando"
            className="bg-primary fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse"
          />
        )}
        <header className="flex h-18 items-center gap-3 px-4 md:px-6">
          <SidebarTrigger className="size-10 md:hidden" aria-label="Abrir menu" />
          <div className="ml-auto">
            <UserMenu email={user.email} />
          </div>
        </header>
        <main className="flex-1 px-4 pb-8 md:px-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
