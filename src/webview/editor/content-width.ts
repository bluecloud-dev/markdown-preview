import type { ContentWidthSetting } from '../../types/config';

const CONTENT_WIDTH_PROPERTY = '--muninn-content-width';

export const resolveContentWidthCssValue = (contentWidth: ContentWidthSetting): string => {
  if (contentWidth === 'comfortable') {
    return '70ch';
  }

  if (contentWidth === 'full') {
    return 'none';
  }

  return `${contentWidth}ch`;
};

export const applyContentWidth = (
  editorShell: Pick<HTMLElement, 'style'>,
  contentWidth: ContentWidthSetting,
): void => {
  editorShell.style.setProperty(CONTENT_WIDTH_PROPERTY, resolveContentWidthCssValue(contentWidth));
};
