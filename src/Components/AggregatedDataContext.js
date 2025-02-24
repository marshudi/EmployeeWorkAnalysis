import React, { createContext, useState } from "react";

export const AggregatedDataContext = createContext();

export const AggregatedDataProvider = ({ children }) => {
  const [aggregatedData, setAggregatedData] = useState([]);
  const [maximumHoursData, setMaximumHoursData] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});
  const [roleLocationCounts, setRoleLocationCounts] = useState({});
  const [roleLocationManDays, setRoleLocationManDays] = useState({});

  return (
    <AggregatedDataContext.Provider
      value={{
        aggregatedData,
        setAggregatedData,
        maximumHoursData,
        setMaximumHoursData,
        roleCounts,
        setRoleCounts,
        roleLocationCounts,
        setRoleLocationCounts,
        roleLocationManDays,
        setRoleLocationManDays,
      }}
    >
      {children}
    </AggregatedDataContext.Provider>
  );
};


export default AggregatedDataProvider;
