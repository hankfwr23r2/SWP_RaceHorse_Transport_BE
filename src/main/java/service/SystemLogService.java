package service;

import entity.SystemLog;

import java.util.List;
import java.util.Optional;

public interface SystemLogService {
    List<SystemLog> findAll();
    Optional<SystemLog> findById(Integer id);
    SystemLog save(SystemLog entity);
    void deleteById(Integer id);
}
