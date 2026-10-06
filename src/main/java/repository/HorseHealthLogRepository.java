package repository;

import entity.HorseHealthLog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HorseHealthLogRepository extends JpaRepository<HorseHealthLog, Integer> {
}
