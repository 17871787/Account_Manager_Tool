"use client";

import React, { useState, useEffect } from "react";
import { Card, Flex, Text, Button } from '@radix-ui/themes';
import Link from 'next/link';
import { Clock, Calendar, TrendingUp } from 'lucide-react';
import { fetchWithSession } from '../../src/utils/fetchWithSession';

interface TimeEntrySummary {
  totalHours: number;
  totalEntries: number;
  projectBreakdown: { name: string; hours: number }[];
}

export function HarvestSummary() {
  const [summary, setSummary] = useState<TimeEntrySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      // Get current week dates
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(now);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const from = startOfWeek.toISOString().split('T')[0];
      const to = endOfWeek.toISOString().split('T')[0];

      const response = await fetchWithSession(`/api/harvest/time-entries?from=${from}&to=${to}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process the data for summary
        const projectMap = new Map<string, number>();
        let totalHours = 0;
        
        data.time_entries.forEach((entry: any) => {
          totalHours += entry.hours;
          const projectName = entry.project?.name || 'No Project';
          projectMap.set(projectName, (projectMap.get(projectName) || 0) + entry.hours);
        });

        const projectBreakdown = Array.from(projectMap.entries())
          .map(([name, hours]) => ({ name, hours }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 5); // Top 5 projects

        setSummary({
          totalHours,
          totalEntries: data.total_entries,
          projectBreakdown
        });
      }
    } catch (error) {
      console.error('Failed to fetch Harvest summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <Text>Loading time tracking data...</Text>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Clock className="h-5 w-5 text-blue-600" />
            <Text size="4" weight="bold">Time Tracking (This Week)</Text>
          </Flex>
          <Link href="/harvest">
            <Button size="2" variant="soft">View Details</Button>
          </Link>
        </Flex>

        {summary ? (
          <>
            <Flex gap="4">
              <Flex direction="column" className="flex-1">
                <Text size="2" color="gray">Total Hours</Text>
                <Text size="6" weight="bold">{summary.totalHours.toFixed(1)}</Text>
              </Flex>
              <Flex direction="column" className="flex-1">
                <Text size="2" color="gray">Time Entries</Text>
                <Text size="6" weight="bold">{summary.totalEntries}</Text>
              </Flex>
            </Flex>

            {summary.projectBreakdown.length > 0 && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">Top Projects</Text>
                {summary.projectBreakdown.map(project => (
                  <Flex key={project.name} justify="between" align="center">
                    <Text size="2">{project.name}</Text>
                    <Text size="2" weight="medium">{project.hours.toFixed(1)}h</Text>
                  </Flex>
                ))}
              </Flex>
            )}
          </>
        ) : (
          <Text size="2" color="gray">No time entries for this week</Text>
        )}
      </Flex>
    </Card>
  );
}
