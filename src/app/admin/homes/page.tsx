'use client';

import { useState, useEffect } from 'react';
import { 
  FiSearch, 
  FiEdit, 
  FiEye, 
  FiFilter, 
  FiDownload, 
  FiCheck, 
  FiX, 
  FiAlertTriangle,
  FiHome,
  FiMapPin,
  FiUsers,
  FiStar,
  FiCalendar,
} from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Home = {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  careLevel: string[];
  capacity: number;
  currentOccupancy: number;
  occupancyRate: string;
  activeResidents: number;
  priceMin: number | null;
  priceMax: number | null;
  createdAt: string;
  operator: {
    id: string;
    companyName: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  } | null;
  averageRating: string | null;
  reviewCount: number;
  photoCount: number;
  activeLicenses: number;
  expiringLicenses: number;
};

export default function AdminHomesPage() {
  const router = useRouter();
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCareLevel, setFilterCareLevel] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchHomes();
  }, [page, filterStatus, filterCareLevel, searchQuery]);

  const fetchHomes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterStatus !== 'ALL' && { status: filterStatus }),
        ...(filterCareLevel !== 'ALL' && { careLevel: filterCareLevel }),
      });

      const response = await fetch(`/api/admin/homes?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API returned error:', data);
        alert(`Failed to load homes: ${data.error || 'Unknown error'}`);
        return;
      }
      
      if (data.homes) {
        setHomes(data.homes);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } else {
        setHomes([]);
      }
    } catch (error) {
      console.error('Failed to fetch homes:', error);
      alert(`Error loading homes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHomes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(filterStatus !== 'ALL' && { status: filterStatus }),
        ...(filterCareLevel !== 'ALL' && { careLevel: filterCareLevel }),
        export: 'true',
      });

      const response = await fetch(`/api/admin/homes?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `homes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export homes:', error);
      alert('Failed to export homes data');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'DRAFT':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOccupancyBadgeClass = (rate: number) => {
    if (rate >= 90) return 'bg-red-100 text-red-800';
    if (rate >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatCareLevel = (levels: string[]) => {
    return levels.map(level => {
      switch (level) {
        case 'INDEPENDENT':
          return 'Independent';
        case 'ASSISTED':
          return 'Assisted';
        case 'MEMORY_CARE':
          return 'Memory Care';
        case 'SKILLED_NURSING':
          return 'Skilled Nursing';
        default:
          return level;
      }
    }).join(', ');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiHome className="text-blue-600" />
            Homes Management
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all assisted living homes on the platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Homes</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <FiHome className="text-3xl text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Homes</p>
                <p className="text-2xl font-bold text-green-600">
                  {homes.filter(h => h.status === 'ACTIVE').length}
                </p>
              </div>
              <FiCheck className="text-3xl text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {homes.filter(h => h.status === 'PENDING_REVIEW').length}
                </p>
              </div>
              <FiAlertTriangle className="text-3xl text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspended</p>
                <p className="text-2xl font-bold text-red-600">
                  {homes.filter(h => h.status === 'SUSPENDED').length}
                </p>
              </div>
              <FiX className="text-3xl text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, city, state, or operator..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            {/* Care Level Filter */}
            <div>
              <select
                value={filterCareLevel}
                onChange={(e) => {
                  setFilterCareLevel(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Care Levels</option>
                <option value="INDEPENDENT">Independent</option>
                <option value="ASSISTED">Assisted</option>
                <option value="MEMORY_CARE">Memory Care</option>
                <option value="SKILLED_NURSING">Skilled Nursing</option>
              </select>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload />
              Export CSV
            </button>
          </div>
        </div>

        {/* Homes Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading homes...</p>
            </div>
          ) : homes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FiHome className="mx-auto text-4xl mb-2" />
              <p>No homes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Home
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Care Levels
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Occupancy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {homes.map((home) => (
                    <tr key={home.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{home.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            {home.averageRating && (
                              <div className="flex items-center gap-1">
                                <FiStar className="text-yellow-500 fill-yellow-500" />
                                <span>{home.averageRating}</span>
                                <span>({home.reviewCount})</span>
                              </div>
                            )}
                            {home.expiringLicenses > 0 && (
                              <span className="text-orange-600 flex items-center gap-1">
                                <FiAlertTriangle />
                                {home.expiringLicenses} expiring
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {home.operator.companyName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {home.operator.user.firstName} {home.operator.user.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {home.address ? (
                          <div className="text-sm text-gray-900 flex items-start gap-1">
                            <FiMapPin className="mt-0.5 flex-shrink-0" />
                            <div>
                              <div>{home.address.city}, {home.address.state}</div>
                              <div className="text-gray-500">{home.address.zipCode}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No address</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatCareLevel(home.careLevel)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            <FiUsers />
                            {home.currentOccupancy} / {home.capacity}
                          </div>
                          <span
                            className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getOccupancyBadgeClass(
                              parseFloat(home.occupancyRate)
                            )}`}
                          >
                            {home.occupancyRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                            home.status
                          )}`}
                        >
                          {home.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/homes/${home.id}`}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <FiEye />
                          </Link>
                          <Link
                            href={`/admin/homes/${home.id}`}
                            className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-50 rounded transition-colors"
                            title="Edit"
                          >
                            <FiEdit />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
