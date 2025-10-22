// src/pages/DatasetsPage.tsx
import React from 'react';
import "./DatasetsPage.css";
import { UploadDatasetFormModal } from '../../components/Dataset Components/UploadDatasetform';
import { DatasetList } from '../../components/Dataset Components/Datasetlist';

export const DatasetsPage: React.FC = () => (
  <div className="datasets-page">
    <title>Dataset</title>

    {/* Header Section */}
    <header className="datasets-page__header">
      <div className="datasets-page__info">
        <h1 className="datasets-page__title">Datasets</h1>
        <p>Manage and analyze your data</p>

        <div className="dataset-filter-bar">
          <input type="text" placeholder="Search datasets..." className="dataset-filter__search" />

          <select className="dataset-filter__select">
            <option value="all">All Status</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <select className="dataset-filter__select">
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Upload Form Section */}
      <section className="datasets-page__upload">
        <UploadDatasetFormModal />
      </section>
    </header>

    
    

    {/* Dataset List Section */}
    <section className="datasets-page__list">
      <DatasetList />
    </section>
  </div>
);

export default DatasetsPage;