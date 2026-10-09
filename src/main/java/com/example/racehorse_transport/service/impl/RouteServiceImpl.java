package com.example.racehorse_transport.service.impl;

import com.example.racehorse_transport.entity.Route;

import com.example.racehorse_transport.repository.RouteRepository;
import com.example.racehorse_transport.service.RouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RouteServiceImpl implements RouteService {

    private final RouteRepository routeRepository;

    @Autowired
    public RouteServiceImpl(RouteRepository routeRepository) {
        this.routeRepository = routeRepository;
    }

    @Override
    public List<Route> findAll() {
        return routeRepository.findAll();
    }

    @Override
    public Optional<Route> findById(Integer id) {
        return routeRepository.findById(id);
    }

    @Override
    public Route save(Route entity) {
        return routeRepository.save(entity);
    }

    @Override
    public void deleteById(Integer id) {
        routeRepository.deleteById(id);
    }

    // =========================================================================
    // PHẦN VIỆC CỦA DEV 3: Lộ trình & Điều phối (Flow 3)
    // =========================================================================
    // TODO (Dev 3): Điều phối viên lập lộ trình.
    // - Viết hàm createRoutePlan(...)
    
    // TODO (Dev 3): Manager duyệt kế hoạch do Điều phối lập.
    // - Viết hàm approveRoutePlan(Integer routeId)

    // =========================================================================
    // PHẦN VIỆC CỦA DEV 4: Vận hành chuyến đi
    // =========================================================================
    // TODO (Dev 4): Tài xế check-in điểm dừng (kèm GPS/Hình ảnh).
    // - Viết hàm checkInAtLocation(Integer routeId, Integer locationId, MultipartFile image, String gpsCoords)

}
