export default function Loading() {
  return (
    <div className='w-[90%] sm:w-full max-w-4xl mx-auto py-5 sm:py-6 space-y-5 sm:space-y-6 px-0 sm:px-4 animate-pulse'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800' />
        <div className='flex-1'>
          <div className='h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2' />
          <div className='h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded' />
        </div>
      </div>
      
      <div className='grid grid-cols-2 gap-4 mb-6'>
        <div className='rounded-2xl bg-slate-100 dark:bg-slate-800/50 h-24' />
        <div className='rounded-2xl bg-slate-100 dark:bg-slate-800/50 h-24' />
      </div>
      
      <div className='rounded-2xl bg-slate-100 dark:bg-slate-800/50 h-64' />
    </div>
  )
}
