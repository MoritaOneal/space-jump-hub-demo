'use client';
import { useEffect } from 'react';
import SpaceJumpApp from '@/components/SpaceJumpApp';
export default function Home(){
  useEffect(()=>{if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);
  return <SpaceJumpApp/>;
}
