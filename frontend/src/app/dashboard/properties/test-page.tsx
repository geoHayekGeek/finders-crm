'use client'

import { useState } from 'react'
import { PropertyCard } from '@/components/PropertyCard'
import { PropertyFilters } from '@/components/PropertyFilters'
import { DataTable } from '@/components/DataTable'
import { propertyColumns } from '@/components/PropertyTableColumns'
import { Property, Category, Status } from '@/types/property'
import { mockProperties, mockCategories, mockStatuses } from '@/utils/api'

export default function TestPage() {
  const [properties] = useState<Property[]>(mockProperties.map(p => ({
    ...p,
    onView: (property: Property) => console.log('View:', property),
    onEdit: (property: Property) => console.log('Edit:', property),
    onDelete: (property: Property) => console.log('Delete:', property)
  })))
  
  const [categories] = useState<Category[]>(mockCategories)
  const [statuses] = useState<Status[]>(mockStatuses)
  const [filters, setFilters] = useState({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Properties Test Page</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Property Card</h2>
          <PropertyCard
            property={properties[0]}
            onView={(p) => console.log('View:', p)}
            onEdit={(p) => console.log('Edit:', p)}
            onDelete={(p) => console.log('Delete:', p)}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Property Filters</h2>
          <PropertyFilters
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            statuses={statuses}
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            onClearFilters={() => setFilters({})}
          />
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-4">Data Table</h2>
        <DataTable
          columns={propertyColumns}
          data={properties}
        />
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-4">Grid View</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onView={(p) => console.log('View:', p)}
              onEdit={(p) => console.log('Edit:', p)}
              onDelete={(p) => console.log('Delete:', p)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
