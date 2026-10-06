package service;

import entity.HorseHealthLog;

import java.util.List;
import java.util.Optional;

public interface HorseHealthLogService {
    List<HorseHealthLog> findAll();
    Optional<HorseHealthLog> findById(Integer id);
    HorseHealthLog save(HorseHealthLog entity);
    void deleteById(Integer id);
    
    // API dành cho Dev 4
    HorseHealthLog updateHorseHealthStatusByEscort(Integer horseId, Integer routeId, String healthStatus, String note);
}
