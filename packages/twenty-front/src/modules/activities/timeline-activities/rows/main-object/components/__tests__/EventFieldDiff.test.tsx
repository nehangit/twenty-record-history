import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { EventFieldDiff } from '@/activities/timeline-activities/rows/main-object/components/EventFieldDiff';
import { getJestMetadataAndApolloMocksWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksWrapper';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

const objectMetadataItems = getTestEnrichedObjectMetadataItemsMock();

const personObjectMetadataItem = objectMetadataItems.find(
  (objectMetadataItem) => objectMetadataItem.nameSingular === 'person',
);

if (!isDefined(personObjectMetadataItem)) {
  throw new Error('Person object metadata mock not found');
}

const jobTitleFieldMetadataItem = personObjectMetadataItem.fields.find(
  (field) => field.name === 'jobTitle',
);

const Wrapper = getJestMetadataAndApolloMocksWrapper({
  objectMetadataItems,
});

const renderFieldDiff = (fieldDiff: { before: unknown; after: unknown }) =>
  render(
    <EventFieldDiff
      fieldDiff={fieldDiff}
      mainObjectMetadataItem={personObjectMetadataItem}
      fieldMetadataItem={jobTitleFieldMetadataItem}
      diffArtificialRecordStoreId="event-id--job-title"
    />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <I18nProvider i18n={i18n}>
          <Wrapper>{children}</Wrapper>
        </I18nProvider>
      ),
    },
  );

describe('EventFieldDiff', () => {
  it('shows the previous and the new value of a changed field', async () => {
    renderFieldDiff({ before: 'Engineer', after: 'Manager' });

    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    expect(await screen.findByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('shows "Empty" for a previous value that was not set', async () => {
    renderFieldDiff({ before: '', after: 'Manager' });

    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(await screen.findByText('Manager')).toBeInTheDocument();
  });

  it('shows "Empty" for a new value that was cleared', async () => {
    renderFieldDiff({ before: 'Engineer', after: null });

    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });
});
