'use client'

interface PropertyPaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  viewMode: 'grid' | 'table'
  entityName?: string // Optional prop to customize the entity name (default: 'properties')
}

export function PropertyPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
  viewMode,
  entityName = 'properties'
}: PropertyPaginationProps) {
  if (viewMode === 'grid') {
    const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
    const end = Math.min(currentPage * itemsPerPage, totalItems)
    return (
      <div className="space-y-4">
        {/* Next/Previous for server-side paged grid view */}
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>

          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, Math.max(totalPages, 1)))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
          >
            Next
          </button>
        </div>
        
        {currentPage >= totalPages && totalPages > 0 ? (
          <div className="flex justify-center">
            <div className="text-center text-sm text-green-600 bg-green-50 px-6 py-3 rounded-lg border border-green-200">
              <span>Last page reached</span>
            </div>
          </div>
        ) : (
          <></>
        )}
        
        {/* Pagination Info for Grid View - Always show */}
        <div className="text-center text-sm text-gray-600">
          Showing {start} to {end} of {totalItems} {entityName}
        </div>
      </div>
    )
  }

  // Table view pagination
  // Always show the items per page dropdown, even if there's only one page
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
        </select>
        <span className="text-sm text-gray-700">entries</span>
      </div>
      
      {/* Only show pagination controls if there are multiple pages */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm border rounded font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium"
          >
            Next
          </button>
        </div>
      )}
      
      <div className="text-sm text-gray-700">
        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
      </div>
    </div>
  )
}
