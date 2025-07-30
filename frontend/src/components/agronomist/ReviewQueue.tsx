import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  User,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Analysis {
  analysis_id: number;
  farmer_id: number;
  farmer_name: string;
  farmer_email: string;
  image_path: string;
  crop_type: string;
  location: string;
  ai_diagnosis: any;
  ai_confidence: number;
  ai_severity: string;
  ai_recommendations: any[];
  priority: number;
  created_at: string;
  farmer_requested: boolean;
  queue_position: number;
  assigned_agronomist_id?: number;
}

interface ReviewQueueProps {
  onReviewAnalysis: (analysisId: number) => void;
  onBulkSelect: (selectedIds: number[]) => void;
}

const ReviewQueue: React.FC<ReviewQueueProps> = ({
  onReviewAnalysis,
  onBulkSelect
}) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    assignedOnly: false,
    priority: '',
    cropType: '',
    farmerRequested: false
  });
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'confidence'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    fetchQueue();
  }, [filters]);

  useEffect(() => {
    onBulkSelect(Array.from(selectedIds));
  }, [selectedIds, onBulkSelect]);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.assignedOnly) queryParams.append('assigned', 'true');
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.cropType) queryParams.append('cropType', filters.cropType);
      if (filters.farmerRequested) queryParams.append('farmer_requested', 'true');

      const response = await fetch(`/api/agronomist/queue?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        const sortedAnalyses = sortAnalyses(data.data.queue, sortBy, sortOrder);
        setAnalyses(sortedAnalyses);
      }
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortAnalyses = (analyses: Analysis[], sortBy: string, order: string) => {
    return [...analyses].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'confidence':
          aValue = a.ai_confidence;
          bValue = b.ai_confidence;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const toggleSelection = (analysisId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(analysisId)) {
      newSelected.delete(analysisId);
    } else {
      newSelected.add(analysisId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === analyses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(analyses.map(a => a.analysis_id)));
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 3: return 'text-red-600 bg-red-100';
      case 2: return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 3: return 'High';
      case 2: return 'Medium';
      default: return 'Low';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.ceil(diffInHours / 24)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading review queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Queue</h2>
          <p className="text-gray-600 mt-1">
            {analyses.length} analyses awaiting review
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <button
              onClick={() => handleSort('priority')}
              className={`px-3 py-1 text-sm rounded-md flex items-center space-x-1 ${
                sortBy === 'priority' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Priority</span>
              {sortBy === 'priority' && (
                sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => handleSort('date')}
              className={`px-3 py-1 text-sm rounded-md flex items-center space-x-1 ${
                sortBy === 'date' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Date</span>
              {sortBy === 'date' && (
                sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => handleSort('confidence')}
              className={`px-3 py-1 text-sm rounded-md flex items-center space-x-1 ${
                sortBy === 'confidence' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Confidence</span>
              {sortBy === 'confidence' && (
                sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
              )}
            </button>
          </div>

          <button
            onClick={fetchQueue}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md"
            title="Refresh queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <Filter className="w-4 h-4 text-gray-600" />
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filters.assignedOnly}
            onChange={(e) => setFilters({ ...filters, assignedOnly: e.target.checked })}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <span className="text-sm text-gray-700">Assigned to me</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={filters.farmerRequested}
            onChange={(e) => setFilters({ ...filters, farmerRequested: e.target.checked })}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <span className="text-sm text-gray-700">Farmer requested</span>
        </label>

        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All priorities</option>
          <option value="3">High priority</option>
          <option value="2">Medium priority</option>
          <option value="1">Low priority</option>
        </select>

        <input
          type="text"
          placeholder="Filter by crop type"
          value={filters.cropType}
          onChange={(e) => setFilters({ ...filters, cropType: e.target.value })}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} analyses selected
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear selection
            </button>
          </div>
        </motion.div>
      )}

      {/* Queue Items */}
      <div className="space-y-4">
        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses to review</h3>
            <p className="text-gray-600">Great job! You're all caught up.</p>
          </div>
        ) : (
          analyses.map((analysis) => (
            <motion.div
              key={analysis.analysis_id}
              layout
              className={`border rounded-lg p-4 transition-all duration-200 ${
                selectedIds.has(analysis.analysis_id)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(analysis.analysis_id)}
                  onChange={() => toggleSelection(analysis.analysis_id)}
                  className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />

                {/* Image Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={analysis.image_path}
                    alt="Crop analysis"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(analysis.priority)}`}>
                          {getPriorityLabel(analysis.priority)}
                        </span>
                        
                        {analysis.farmer_requested && (
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            Farmer Requested
                          </span>
                        )}
                        
                        <span className="text-xs text-gray-500">
                          #{analysis.queue_position}
                        </span>
                      </div>

                      {/* Farmer and Crop Info */}
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {analysis.farmer_name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {analysis.crop_type} • {analysis.location}
                        </div>
                      </div>

                      {/* AI Diagnosis Summary */}
                      <div className="flex items-center space-x-3 mb-3">
                        {getSeverityIcon(analysis.ai_severity)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {analysis.ai_diagnosis.title || 'Analysis Complete'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">
                              Confidence: {Math.round(analysis.ai_confidence * 100)}%
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              Severity: {analysis.ai_severity}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedCard === analysis.analysis_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-gray-200 pt-3 mt-3"
                          >
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-1">
                                  AI Diagnosis Details
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {analysis.ai_diagnosis.description || 'No detailed description available'}
                                </p>
                              </div>
                              
                              {analysis.ai_recommendations.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    AI Recommendations
                                  </h4>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {analysis.ai_recommendations.slice(0, 3).map((rec, index) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span className="text-green-600 mt-1">•</span>
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setExpandedCard(
                          expandedCard === analysis.analysis_id ? null : analysis.analysis_id
                        )}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        title={expandedCard === analysis.analysis_id ? 'Collapse' : 'Expand details'}
                      >
                        {expandedCard === analysis.analysis_id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => onReviewAnalysis(analysis.analysis_id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Review</span>
                      </button>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatTimeAgo(analysis.created_at)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Bulk Actions Bar */}
      {analyses.length > 0 && (
        <div className="flex items-center justify-between py-4 border-t border-gray-200">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedIds.size === analyses.length && analyses.length > 0}
              onChange={selectAll}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Select all visible</span>
          </label>

          <div className="text-sm text-gray-600">
            Showing {analyses.length} analyses
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewQueue;