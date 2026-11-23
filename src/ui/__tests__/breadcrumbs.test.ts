// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { BreadcrumbsView } from '../breadcrumbs';

describe('BreadcrumbsView', () => {
  it('renders root $ segment by default', () => {
    const container = document.createElement('nav');
    const copyBtn = document.createElement('button');
    const onNavigate = vi.fn();
    const onCopyStatus = vi.fn();

    const breadcrumbs = new BreadcrumbsView(container, copyBtn, {
      onNavigatePath: onNavigate,
      onCopyStatus,
    });

    expect(breadcrumbs.getCurrentPath()).toEqual([]);
    expect(container.children.length).toBe(1);
    expect(container.textContent).toContain('$');
    expect(copyBtn.disabled).toBe(true);

    // Clicking root triggers onNavigate with []
    (container.children[0] as HTMLElement).click();
    expect(onNavigate).toHaveBeenCalledWith([]);
  });

  it('renders path segments and navigates to subpath on click', () => {
    const container = document.createElement('nav');
    const copyBtn = document.createElement('button');
    const onNavigate = vi.fn();
    const onCopyStatus = vi.fn();

    const breadcrumbs = new BreadcrumbsView(container, copyBtn, {
      onNavigatePath: onNavigate,
      onCopyStatus,
    });

    breadcrumbs.setPath(['users', 0, 'profile', 'name']);
    expect(breadcrumbs.getCurrentPath()).toEqual(['users', 0, 'profile', 'name']);
    expect(copyBtn.disabled).toBe(false);

    // Find the 'users' button and click it
    const items = container.querySelectorAll('.breadcrumb-item');
    expect(items.length).toBe(5); // $ + users + [0] + profile + name

    (items[1] as HTMLElement).click();
    expect(onNavigate).toHaveBeenCalledWith(['users']);

    (items[2] as HTMLElement).click();
    expect(onNavigate).toHaveBeenCalledWith(['users', 0]);
  });
});
