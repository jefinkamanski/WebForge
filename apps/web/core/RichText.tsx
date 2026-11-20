import type { BlockNode, ImageAsset, InlineNode, Mark, PostDoc } from '@webforge/shared';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { mediaUrl } from './site';
import { SmartLink } from './SmartLink';

// Monta o texto dos posts a partir do formato do editor. Só estes elementos existem
// (a API valida o conteúdo ao salvar) e nada vira HTML cru: texto é sempre texto.

function withMark(mark: Mark, children: ReactNode, key: number): ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong key={key}>{children}</strong>;
    case 'italic':
      return <em key={key}>{children}</em>;
    case 'link':
      return (
        <SmartLink
          key={key}
          href={mark.attrs.href}
          className="text-brand-700 font-medium underline"
        >
          {children}
        </SmartLink>
      );
  }
}

function Inline({ nodes = [] }: { nodes?: InlineNode[] | undefined }) {
  return nodes.map((node, index) => {
    if (node.type === 'hardBreak') return <br key={index} />;
    // O link fica por fora (aplicado por último), com negrito/itálico dentro dele
    const marks = [...(node.marks ?? [])].sort(
      (a, b) => Number(a.type === 'link') - Number(b.type === 'link'),
    );
    return marks.reduce<ReactNode>((children, mark) => withMark(mark, children, index), node.text);
  });
}

const isEmpty = (block: BlockNode<ImageAsset>) =>
  block.type === 'paragraph' && (!block.content || block.content.length === 0);

function Blocks({ blocks }: { blocks: BlockNode<ImageAsset>[] }) {
  return blocks
    .filter((block) => !isEmpty(block))
    .map((block, index) => <Block key={index} block={block} />);
}

function Block({ block }: { block: BlockNode<ImageAsset> }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p>
          <Inline nodes={block.content} />
        </p>
      );
    case 'heading':
      return block.attrs.level === 2 ? (
        <h2 className="text-ink pt-4 text-2xl font-bold">
          <Inline nodes={block.content} />
        </h2>
      ) : (
        <h3 className="text-ink pt-2 text-xl font-semibold">
          <Inline nodes={block.content} />
        </h3>
      );
    case 'bulletList':
    case 'orderedList': {
      const List = block.type === 'bulletList' ? 'ul' : 'ol';
      return (
        <List className={`space-y-2 pl-6 ${List === 'ul' ? 'list-disc' : 'list-decimal'}`}>
          {block.content.map((item, index) => (
            <li key={index} className="space-y-2 pl-1">
              <Blocks blocks={item.content} />
            </li>
          ))}
        </List>
      );
    }
    case 'blockquote':
      return (
        <blockquote className="border-brand-600 text-ink-muted space-y-4 border-l-4 pl-5 italic">
          <Blocks blocks={block.content} />
        </blockquote>
      );
    case 'horizontalRule':
      return <hr className="border-line" />;
    case 'image':
      return (
        <figure>
          <Image
            src={mediaUrl(block.attrs.url)}
            alt={block.attrs.alt}
            width={block.attrs.width}
            height={block.attrs.height}
            sizes="(min-width: 768px) 720px, 100vw"
            className="h-auto w-full rounded-lg"
          />
        </figure>
      );
  }
}

export function RichText({
  doc,
  className = '',
}: {
  doc: PostDoc<ImageAsset>;
  className?: string;
}) {
  return (
    <div className={`text-ink space-y-5 text-lg leading-8 ${className}`}>
      <Blocks blocks={doc.content} />
    </div>
  );
}
