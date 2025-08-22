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
  viewMode
}: PropertyPaginationProps) {
  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        {/* Load More Button for Grid View */}
        {currentPage < totalPages ? (
          <div className="flex justify-center">
            <button
              onClick={() => onPageChange(currentPage + 1)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
            >
              <span>Load More Properties</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="text-center text-sm text-gray-500 bg-gray-50 px-6 py-3 rounded-lg border border-gray-200">
              <span>All properties loaded</span>
            </div>
          </div>
        )}
        
        {/* Pagination Info for Grid View - Always show */}
        <div className="text-center text-sm text-gray-600">
          Showing {Math.min(totalItems, currentPage * itemsPerPage)} of {totalItems} properties
          {currentPage >= totalPages && (
            <span className="block mt-1 text-green-600 font-medium">✓ All properties loaded</span>
          )}
        </div>
      </div>
    )
  }

  // Table view pagination
  if (totalPages <= 1) return null

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
        </select>
        <span className="text-sm text-gray-700">entries</span>
      </div>
      
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
      
      <div className="text-sm text-gray-700">
        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
      </div>
    </div>
  )
}
