import React from 'react';
import ReturnItemClient from './ReturnItemClient';

export const metadata = {
  title: "คืนครุภัณฑ์ที่ยืมมา (Return System)",
};

export default async function ReturnItemPage() {
  return <ReturnItemClient />;
}
