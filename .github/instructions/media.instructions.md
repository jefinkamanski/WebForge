---
description: Upload, otimização e exclusão de mídia (imagens e vídeos)
applyTo: "apps/api/src/modules/media/**"
---

# Mídia

## Imagens
- No upload, valide tipo real do arquivo (não confie na extensão) e tamanho (`UPLOAD_MAX_IMAGE_MB`).
- Converta com `sharp` para **WebP** e gere larguras responsivas (ex.: 480, 768, 1280, 1920). Não sirva o original.
- Processe **uma imagem por vez** para economizar RAM. Guarde largura/altura e `alt` (obrigatório).

## Vídeos
- **Sem transcodificação no servidor** (sem ffmpeg). Aceite apenas MP4 (H.264) e WebM já otimizados, até `UPLOAD_MAX_VIDEO_MB`.
- Exija um poster (imagem) para o vídeo do hero; ele é convertido para WebP.
- Opcionalmente aceite link de YouTube/Vimeo.

## Armazenamento e exclusão
- Use uma interface `StorageProvider` (disco local em `UPLOAD_DIR`, S3-compatível opcional). Nunca grave dentro da pasta do app.
- Nomes de arquivo gerados pelo servidor (nunca use o nome enviado). Proteja contra path traversal.
- Excluir uma mídia remove todas as variantes. Se ela estiver referenciada (seção, post), **bloqueie a exclusão** e informe onde está em uso.
