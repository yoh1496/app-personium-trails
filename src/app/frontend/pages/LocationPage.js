import React, { useEffect, Suspense, useCallback } from 'react';
import PropTypes from 'prop-types';
import { atom, selector, useRecoilValue, useSetRecoilState } from 'recoil';

import { useParams } from 'react-router-dom';
import { Item, Container, Header } from 'semantic-ui-react';

import { authState } from '../lib/personium_auth_adapter';
import { adapter, getYMD } from '../adapters/locations_direct';

import { StayItem } from '../parts/StayItem';
import { MoveItem } from '../parts/MoveItem';

import {
  locationACLStatusState,
  useLocationACLSubscribe,
} from '../common/location_stat';

const locationQuery = atom({
  key: 'searchLocationQuery',
  default: {
    year: 2020,
    month: null,
    day: null,
  },
});

const locationResults = selector({
  key: 'searchLocationResult',
  get: async ({ get }) => {
    const query = get(locationQuery);
    if (query.year === null || query.month === null || query.day === null) {
      console.log('null');
      return await [];
    }

    const { year, month, day } = query;

    const queryDate = new Date(year, month - 1, day);
    return await Promise.all([
      adapter.getStaysByDate(queryDate),
      adapter.getMovesByDate(queryDate),
      adapter.getTimelineByDate(queryDate),
    ])
      .then(([stayDat, moveDat, stat]) => {
        console.log(stat);
        const _results = [].concat(stayDat, moveDat).map(item => {
          // resolve filename
          const timems = parseInt(item.startTime.match(/\/Date\((\d+)\)\//)[1]);
          const filename = `${'placeId' in item ? 's' : 'm'}_${timems}.json`;
          const folder = `${authState.boxUrl}exported/${getYMD(timems)}/`;
          const filepath = `${folder}${filename}`;
          console.log({ item, stat: stat.get(filepath) });
          return {
            timestampms: timems,
            dat: item,
          };
        });
        return _results;
      })
      .then(results => results.sort((a, b) => a.timestampms - b.timestampms))
      .then(results => results.map(item => item.dat));
  },
});

function LocationFilter() {
  const setQuery = useSetRecoilState(locationQuery);
  const { year, month, day } = useParams();

  useEffect(() => {
    setQuery({
      year: Number(year),
      month: Number(month),
      day: Number(day),
    });
  }, [year, month, day]);

  return (
    <Header as="h3">
      Locations on{' '}
      {new Date(
        Number(year),
        Number(month - 1),
        Number(day)
      ).toLocaleDateString()}
    </Header>
  );
}

function LocationItem({ item }) {
  const timems = parseInt(item.startTime.match(/\/Date\((\d+)\)\//)[1]);
  const filename = `${'placeId' in item ? 's' : 'm'}_${timems}.json`;
  const folder = `${authState.boxUrl}exported/${getYMD(timems)}/`;
  const filepath = `${folder}${filename}`;

  const {
    setLocationACLPrivate,
    setLocationACLPublic,
  } = useLocationACLSubscribe(item.__id, filepath);
  const aclStatus = useRecoilValue(locationACLStatusState(item.__id));

  const onClick = useCallback(() => {
    if (aclStatus === 'loading') return;
    if (aclStatus === 'public') {
      setLocationACLPrivate();
    } else {
      setLocationACLPublic();
    }
  }, [aclStatus]);

  if ('placeId' in item) {
    return (
      <StayItem
        dat={item}
        key={`list-${item.__id}`}
        isPublic={aclStatus === 'public'}
        isLoading={aclStatus === 'loading'}
        onClick={onClick}
      />
    );
  } else {
    return (
      <MoveItem
        dat={item}
        key={`list-${item.__id}`}
        isPublic={aclStatus === 'public'}
        isLoading={aclStatus === 'loading'}
        onClick={onClick}
      />
    );
  }
}

export function LocationPage() {
  const locations = useRecoilValue(locationResults);

  return (
    <Container>
      <LocationFilter />
      <Suspense fallback={<h1>loading</h1>}>
        <Item.Group>
          {locations.map(item => (
            <LocationItem item={item} key={`location_item_${item.__id}`} />
          ))}
        </Item.Group>
      </Suspense>
    </Container>
  );
}

LocationPage.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      year: PropTypes.string,
      month: PropTypes.string,
      day: PropTypes.string,
    }),
  }),
};
