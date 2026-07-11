"use client"
import React from 'react'
import Sidebar from '../components/Sidebar'

const layout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className='flex flex-row min-h-screen'>
      <Sidebar />
      {children}
    </div>
  )
}

export default layout