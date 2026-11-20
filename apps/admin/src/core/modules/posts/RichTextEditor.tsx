import {
  HREF_MESSAGE,
  isSafeHref,
  mapPostImages,
  type MediaItem,
  type PostDoc,
} from '@webforge/shared';
import Image from '@tiptap/extension-image';
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  BoldIcon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  Undo2Icon,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { mediaUrl } from '../../lib/api.ts';
import { useMediaPicker } from '../media/MediaPicker.tsx';

// Imagem da biblioteca: guarda o id da mídia; src e alt servem só para mostrar no editor
const LibraryImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => Number(element.getAttribute('data-media-id')) || null,
        renderHTML: (attributes) =>
          attributes['mediaId'] ? { 'data-media-id': String(attributes['mediaId']) } : {},
      },
    };
  },
});

// Só os elementos que o site sabe mostrar (o mesmo conjunto do postDocSchema)
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      isAllowedUri: (url) => isSafeHref(url),
      HTMLAttributes: { rel: 'noopener noreferrer', target: null },
    },
  }),
  LibraryImage.configure({ allowBase64: false }),
];

type ImageAttrs = { src?: string; alt?: string; mediaId?: number | null };

// PostDoc (API) -> conteúdo do editor, com a URL e o alt de cada imagem
export function toEditorContent(doc: PostDoc, media: Record<number, MediaItem>): JSONContent {
  return mapPostImages(doc, ({ mediaId }) => {
    const item = media[mediaId];
    return { mediaId, src: item ? mediaUrl(item.url) : '', alt: item?.alt ?? '' };
  }) as JSONContent;
}

// Conteúdo do editor -> PostDoc. Imagens sem id (coladas de fora) são descartadas:
// toda imagem do post precisa estar na biblioteca.
export function fromEditorContent(json: JSONContent): PostDoc {
  return mapPostImages(json as PostDoc<ImageAttrs>, (attrs) =>
    attrs.mediaId ? { mediaId: attrs.mediaId } : null,
  );
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`focus-visible:ring-ring/50 flex size-8 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] disabled:opacity-40 [&_svg]:size-4 ${
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

function editLink(editor: Editor) {
  const current = editor.getAttributes('link')['href'] as string | undefined;
  const url = window.prompt('Endereço do link (deixe vazio para remover):', current ?? 'https://');
  if (url === null) return;
  const href = url.trim();
  if (href === '' || href === 'https://') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  if (!isSafeHref(href)) {
    window.alert(HREF_MESSAGE);
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
}

function Toolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatação do texto"
      className="bg-muted flex flex-wrap items-center gap-1 border-b px-2 py-1"
    >
      <ToolbarButton label="Negrito" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <BoldIcon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Itálico"
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <ItalicIcon aria-hidden="true" />
      </ToolbarButton>
      <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
      <ToolbarButton
        label="Título"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2Icon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Subtítulo"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3Icon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Lista"
        active={state.bullet}
        onClick={() => chain().toggleBulletList().run()}
      >
        <ListIcon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Lista numerada"
        active={state.ordered}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrderedIcon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        label="Citação"
        active={state.quote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <QuoteIcon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton label="Linha divisória" onClick={() => chain().setHorizontalRule().run()}>
        <MinusIcon aria-hidden="true" />
      </ToolbarButton>
      <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
      <ToolbarButton label="Link" active={state.link} onClick={() => editLink(editor)}>
        <LinkIcon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton label="Inserir imagem" onClick={onInsertImage}>
        <ImageIcon aria-hidden="true" />
      </ToolbarButton>
      <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
      <ToolbarButton
        label="Desfazer"
        disabled={!state.canUndo}
        onClick={() => chain().undo().run()}
      >
        <Undo2Icon aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton label="Refazer" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2Icon aria-hidden="true" />
      </ToolbarButton>
    </div>
  );
}

export interface RichTextEditorProps {
  label: string;
  // Conteúdo inicial (só lido na montagem)
  initialContent: JSONContent;
  onChange: (doc: PostDoc) => void;
  error?: string | undefined;
}

// Editor visual do texto dos posts (TipTap), com imagens da biblioteca de mídia
export function RichTextEditor({ label, initialContent, onChange, error }: RichTextEditorProps) {
  const id = useId();
  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        id,
        class: 'rich-text min-h-72 px-4 py-3 focus:outline-none',
        'aria-labelledby': `${id}-label`,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor: current }) => onChange(fromEditorContent(current.getJSON())),
  });

  const picker = useMediaPicker({
    kind: 'image',
    onChoose: (item) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: { src: mediaUrl(item.url), alt: item.alt, mediaId: item.id },
        })
        .run();
    },
  });

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <div
        className={`focus-within:border-ring focus-within:ring-ring/50 overflow-hidden rounded-md border focus-within:ring-[3px] ${error ? 'border-destructive' : 'border-input'}`}
      >
        <Toolbar editor={editor} onInsertImage={picker.open} />
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-error-foreground text-xs font-medium">{error}</p>}
      {picker.dialog}
    </div>
  );
}
