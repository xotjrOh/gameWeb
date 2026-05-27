import { Fragment } from 'react';
import { Box } from '@mui/material';
import {
  getRulebookTextSegments,
  RULEBOOK_HIGHLIGHT_MARK_STYLE,
} from '@/components/murderMystery/rulebookPagination';

interface RulebookRichTextProps {
  text: string;
  highlights?: string[];
}

const RulebookRichText = ({ text, highlights = [] }: RulebookRichTextProps) => (
  <>
    {getRulebookTextSegments(text, highlights).map((segment, index) =>
      segment.highlighted ? (
        <Box
          key={`${index}:strong`}
          component="strong"
          sx={RULEBOOK_HIGHLIGHT_MARK_STYLE}
        >
          {segment.text}
        </Box>
      ) : (
        <Fragment key={`${index}:text`}>{segment.text}</Fragment>
      )
    )}
  </>
);

export default RulebookRichText;
