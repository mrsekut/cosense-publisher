type PageLike = {
  title: string;
  lines: { text: string }[];
  updated: number;
};

export const filterPrivatePages = <T extends PageLike>(
  pages: T[],
  lastImportTime: number,
): T[] =>
  pages.filter(p => !hasPrivateIcon(p)).filter(p => p.updated > lastImportTime);

export const hasPrivateIcon = (p: PageLike) =>
  p.lines.some(l => l.text.includes('[private.icon]'));

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  const makePage = (title: string, lines: string[], updated = 100) => ({
    title,
    lines: lines.map(text => ({ text })),
    updated,
  });

  test('private.iconを含むページを検出する', () => {
    const page = makePage('secret', ['title', '[private.icon]', 'body']);
    expect(hasPrivateIcon(page)).toBe(true);
  });

  test('private.iconが行の途中にあっても検出する', () => {
    const page = makePage('secret', ['title', 'foo [private.icon] bar']);
    expect(hasPrivateIcon(page)).toBe(true);
  });

  test('private.iconを含まないページはfalse', () => {
    const page = makePage('public', ['title', 'body']);
    expect(hasPrivateIcon(page)).toBe(false);
  });

  test('空のページはfalse', () => {
    const page = makePage('empty', []);
    expect(hasPrivateIcon(page)).toBe(false);
  });
}
