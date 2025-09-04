// src/utils/parseMessage.ts
export type Part = { type: 'text' | 'code' | 'bold' | 'italic'; text: string; lang?: string }

/**
 * Parser robuste :
 * 1) Extrait d'abord les fences Markdown fermés: ```lang\n...\n```
 * 2) Puis gère les blocs custom CODE :
 *    - Ouverture tolérante : backticks 1..4 à GAUCHE de CODE
 *      (ex: `CODE, ``CODE, ```CODE, ````CODE) + optionnels 0..4 à DROITE
 *      (ex: `CODE`, ``CODE``, etc.). On corrige aussi les cas "``CODE" (pas de ticks à droite).
 *    - Fermeture tolérante : /CODE avec backticks 0..4 à DROITE et/ou 1..4 à GAUCHE
 *      (``/CODE, /CODE`, ``/CODE``, ```/CODE```, etc.). On corrige aussi les cas « mal fermés »
 *      mentionnés (ex: /CODE``, ``/CODE`, ```/CODE`), ET on absorbe un éventuel '<' juste
 *      avant /CODE (ex: </CODE``).
 *    - Si aucune fermeture valide n’est trouvée : on englobe jusqu’à la fin.
 * 3) Le gras/italique est appliqué UNIQUEMENT sur les segments texte (jamais dans le code).
 */
export function parseMessage(content: string): Part[] {
  const parts: Part[] = []
  if (!content) return parts

  // --- 1) Fences markdown fermés: ```lang ... ```
  const fenceRe = /```(\w+)?\n([\s\S]*?)```/g
  let last = 0
  let fm: RegExpExecArray | null

  while ((fm = fenceRe.exec(content)) !== null) {
    if (fm.index > last) pushInline(parts, content.slice(last, fm.index))
    const lang = (fm[1] || '').toLowerCase() || undefined
    const code = (fm[2] || '').replace(/\n$/, '')
    parts.push({ type: 'code', text: code, lang })
    last = fenceRe.lastIndex
  }

  // Reste à traiter pour les blocs CODE souples
  const remaining = content.slice(last)
  if (!remaining) return parts.length ? parts : [{ type: 'text', text: content }]

  let cursor = 0
  while (cursor < remaining.length) {
    const open = findLooseOpen(remaining, cursor)
    if (!open) {
      // Pas d'ouverture -> tout le reste en texte (avec inline)
      pushInline(parts, remaining.slice(cursor))
      break
    }

    // Texte avant l’ouverture
    if (open.openStart > cursor) {
      pushInline(parts, remaining.slice(cursor, open.openStart))
    }

    // Contenu code commence après l’ouverture consommée
    const start = open.openEnd

    const close = findLooseClose(remaining, start)
    if (!close) {
      // Non fermé : tout jusqu’à la fin est du code
      parts.push({ type: 'code', text: remaining.slice(start) })
      cursor = remaining.length
      break
    }

    // Fermé : extraire le code entre openEnd et closeStart
    parts.push({ type: 'code', text: remaining.slice(start, close.closeStart) })
    cursor = close.closeEnd // reprendre après le closing
  }

  if (!parts.length && content) parts.push({ type: 'text', text: content })
  return parts
}

/**
 * Trouve une ouverture "souple" de CODE à partir de fromIdx.
 * On accepte :
 *   - backticks 1..4 immédiatement à GAUCHE de 'CODE'
 *   - ET 0..4 backticks à DROITE (optionnels)
 *   - on ignore '/CODE' (c'est une fermeture)
 *
 * Exemples valides d'ouverture :
 *   `CODE
 *   `CODE`
 *   ``CODE
 *   ``CODE``
 *   ```CODE```
 *   ````CODE````
 *   (et le cas strict ``CODE`` est bien sûr couvert)
 */
function findLooseOpen(
  src: string,
  fromIdx: number,
): { openStart: number; openEnd: number } | null {
  const target = 'CODE'
  let i = fromIdx

  while (i < src.length) {
    const j = src.indexOf(target, i)
    if (j === -1) return null

    // Ne pas considérer '/CODE' comme une ouverture
    if (j > 0 && src[j - 1] === '/') {
      i = j + target.length
      continue
    }

    // Compter les backticks immédiats à gauche (max 4)
    let left = j - 1
    let leftTicks = 0
    while (left >= 0 && src.charCodeAt(left) === 0x60 /* ` */ && leftTicks < 4) {
      leftTicks++
      left--
    }

    if (leftTicks >= 1) {
      // Optionnel : backticks à droite (max 4), on les "consomme" si présents
      let k = j + target.length
      let rightTicks = 0
      while (k < src.length && src.charCodeAt(k) === 0x60 /* ` */ && rightTicks < 4) {
        rightTicks++
        k++
      }

      const openStart = j - leftTicks // inclut les backticks de gauche
      const openEnd = j + target.length + rightTicks // inclut les éventuels backticks de droite
      return { openStart, openEnd }
    }

    // Cas strict exact ``CODE`` (pour compat ascendante si leftTicks==0)
    if (src.startsWith('``CODE``', j - 2)) {
      return { openStart: j - 2, openEnd: j + target.length + 2 }
    }

    // Sinon continuer la recherche
    i = j + target.length
  }

  return null
}

/**
 * Trouve une fermeture "souple" de /CODE à partir de fromIdx.
 * On accepte :
 *   - backticks 1..4 à GAUCHE et/ou 0..4 à DROITE
 *   - on corrige /CODE collé à des backticks (avant, après, ou les deux)
 *   - on absorbe un '<' juste avant /CODE (ex: </CODE``) pour éviter qu'il reste traîner
 *
 * Exemples valides de fermeture :
 *   ``/CODE
 *   /CODE`
 *   ``/CODE``
 *   ```/CODE```
 *   ``/CODE````  (ticks à droite > ticks à gauche : on accepte)
 *   </CODE``     (le '<' est absorbé)
 *   (et le strict ``/CODE`` aussi)
 */
function findLooseClose(
  src: string,
  fromIdx: number,
): { closeStart: number; closeEnd: number } | null {
  const target = '/CODE'
  let i = fromIdx

  while (i < src.length) {
    const j = src.indexOf(target, i)
    if (j === -1) return null

    // Backticks à gauche (max 4)
    let left = j - 1
    let leftTicks = 0
    while (left >= 0 && src.charCodeAt(left) === 0x60 /* ` */ && leftTicks < 4) {
      leftTicks++
      left--
    }

    // Backticks à droite (max 4)
    let k = j + target.length
    let rightTicks = 0
    while (k < src.length && src.charCodeAt(k) === 0x60 /* ` */ && rightTicks < 4) {
      rightTicks++
      k++
    }

    // Absorber un '<' juste avant /CODE si présent
    const hasLeftAngle = j - 1 >= 0 && src[j - 1] === '<'
    const angleConsumed = hasLeftAngle && leftTicks === 0 ? 1 : 0

    // Critères d'acceptation :
    //  - au moins 1 backtick à gauche  OU
    //  - au moins 1 backtick à droite  OU
    //  - un '<' immédiatement à gauche (pour </CODE``)
    if (leftTicks > 0 || rightTicks > 0 || hasLeftAngle) {
      const closeStart = j - leftTicks - angleConsumed
      const closeEnd = j + target.length + rightTicks
      return { closeStart, closeEnd }
    }

    // Continuer à chercher un autre /CODE
    i = j + target.length
  }

  return null
}

/**
 * Inline : **bold** et _italic_ uniquement dans le TEXTE.
 * Supporte les échappements \* et \_.
 */
function pushInline(out: Part[], text: string): void {
  if (!text) return

  const ESC_STAR = '\uE000'
  const ESC_UND = '\uE001'
  let safe = text.replace(/\\\*/g, ESC_STAR).replace(/\\_/g, ESC_UND)

  // **gras** ou _italic_ (on limite les faux positifs)
  const inlineRe = /(\*\*(.+?)\*\*)|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g

  let last = 0
  let m: RegExpExecArray | null
  while ((m = inlineRe.exec(safe)) !== null) {
    if (m.index > last) {
      out.push({ type: 'text', text: unescapeInline(safe.slice(last, m.index)) })
    }
    if (m[1]) {
      out.push({ type: 'bold', text: unescapeInline(m[2]) })
    } else {
      out.push({ type: 'italic', text: unescapeInline(m[3]) })
    }
    last = inlineRe.lastIndex
  }

  if (last < safe.length) {
    out.push({ type: 'text', text: unescapeInline(safe.slice(last)) })
  }

  function unescapeInline(s: string) {
    return s.replace(new RegExp(ESC_STAR, 'g'), '*').replace(new RegExp(ESC_UND, 'g'), '_')
  }
}
