package service;

import entity.Staff;

import java.util.List;
import java.util.Optional;

public interface StaffService {
    List<Staff> findAll();
    Optional<Staff> findById(Integer id);
    Staff save(Staff entity);
    void deleteById(Integer id);
}
