// 授業・形式のプルダウンの行。
import React from 'react';
import FilterSelect from './FilterSelect';
import { KIND_OPTIONS } from '../../lib/announce/filters';
import { t } from '../../lib/ui/text';

export default function CourseKindFilters({ baseFontSize, courseValue, setCourse, courseColor, courseOptions, kind, setKind, kindColor }) {
  return (
    <div style={{ padding: '0 1em', display: 'flex', gap: '0.429em' }}>
      <FilterSelect fontPx={baseFontSize}
        label={t('class.courseFilter')}
        value={courseValue}
        onChange={setCourse}
        allLabel={t('class.allCourses')}
        theme={courseColor}
        options={courseOptions}
      />
      <FilterSelect fontPx={baseFontSize}
        label={t('class.kindFilter')}
        value={kind}
        onChange={setKind}
        allLabel={t('class.allKinds')}
        theme={kindColor}
        options={KIND_OPTIONS}
      />
    </div>
  );
}
