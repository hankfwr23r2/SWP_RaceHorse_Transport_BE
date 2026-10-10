package com.example.racehorse_transport.repository;

import com.example.racehorse_transport.entity.HorseHealthLog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HorseHealthLogRepository extends JpaRepository<HorseHealthLog, Integer> {
}
